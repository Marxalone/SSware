const { fork } = require('child_process')
const path = require('path')
const fs = require('fs-extra')

// Map of userId -> { process, startTime, logs[], restartCount, messageCount, phoneNumber }
const activeBots = new Map()

let io = null
let supabase = null

function setIo(socketIo) { io = socketIo }
function setSupabase(sb) { supabase = sb }

// Emit log to user's socket room
function emitLog(userId, level, message) {
  if (!io) return
  const entry = { level, message: message.trim(), timestamp: new Date().toISOString() }
  
  // Store in memory (last 200 logs)
  const bot = activeBots.get(userId)
  if (bot) {
    bot.logs.push(entry)
    if (bot.logs.length > 200) bot.logs.shift()
    
    // Count messages from bot output
    if (message.includes('messages.upsert') || message.toLowerCase().includes('message received')) {
      bot.messageCount++
    }
  }

  // Emit to user room
  io.to(`user:${userId}`).emit('bot:log', entry)
  
  // Emit to admin room
  io.to('admin').emit('admin:bot:log', { userId, ...entry })
}

// Emit status update
function emitStatus(userId, status, extra = {}) {
  if (!io) return
  io.to(`user:${userId}`).emit('bot:status', { status, ...extra })
  io.to('admin').emit('admin:bot:status', { userId, status, ...extra })
}

// Detect pairing code from bot output
function detectPairingCode(text) {
  // Matches patterns like "ABCD-1234" or "ABCD1234"
  const match = text.match(/([A-Z0-9]{4}-[A-Z0-9]{4})/i) ||
                text.match(/Pairing Code.*?:\s*([A-Z0-9\-]{8,9})/i) ||
                text.match(/Your Pairing Code\s*:\s*([A-Z0-9\-]+)/i)
  return match ? match[1] : null
}

async function startBot(userId, phoneNumber) {
  if (activeBots.has(userId)) {
    return { error: 'Bot is already running' }
  }

  const botDir = path.resolve(process.env.BOT_DIR || './bot')
  const sessionDir = path.resolve(process.env.SESSIONS_DIR || './sessions', userId)
  const botEntry = path.join(botDir, 'index.js')

  // Check bot files exist
  if (!fs.existsSync(botEntry)) {
    return { error: 'Bot files not found on server. Contact admin.' }
  }

  // Ensure session directory exists
  await fs.ensureDir(sessionDir)

  console.log(`[Manager] Starting bot for user ${userId}, phone: ${phoneNumber}`)

  const botProcess = fork(botEntry, [], {
    env: {
      ...process.env,
      SESSION_PATH: sessionDir,
      PHONE_NUMBER: phoneNumber,
      USER_ID: userId,
      // Override bot settings to use dynamic session path
      FORCE_SESSION_PATH: sessionDir,
      FORCE_PHONE: phoneNumber
    },
    cwd: botDir,
    silent: true // capture stdout/stderr ourselves
  })

  const entry = {
    process: botProcess,
    startTime: Date.now(),
    logs: [],
    restartCount: 0,
    messageCount: 0,
    phoneNumber,
    userId
  }

  activeBots.set(userId, entry)

  // Update DB status to running
  if (supabase) {
    await supabase.from('bot_sessions').upsert({
      user_id: userId,
      status: 'running',
      phone_number: phoneNumber,
      started_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  emitStatus(userId, 'running', { phoneNumber })
  emitLog(userId, 'info', `🚀 Bot starting for number ${phoneNumber}...`)

  // Handle stdout
  botProcess.stdout.on('data', (data) => {
    const text = data.toString()
    const lines = text.split('\n').filter(l => l.trim())
    
    for (const line of lines) {
      emitLog(userId, 'info', line)
      
      // Detect and emit pairing code
      const code = detectPairingCode(line)
      if (code) {
        console.log(`[Manager] Pairing code detected for ${userId}: ${code}`)
        emitLog(userId, 'pairing', `🔑 Pairing Code: ${code}`)
        if (io) {
          io.to(`user:${userId}`).emit('bot:pairing_code', { code })
        }
      }

      // Detect successful connection
      if (line.includes('Connected to =>') || line.includes('Bot Connected Successfully')) {
        emitStatus(userId, 'connected', { phoneNumber })
        if (supabase) {
          supabase.from('bot_sessions').update({
            status: 'connected',
            last_active: new Date().toISOString()
          }).eq('user_id', userId)
        }
      }

      // Detect disconnection
      if (line.includes('Connection closed') || line.includes('logged out')) {
        emitStatus(userId, 'disconnected')
      }
    }
  })

  // Handle stderr
  botProcess.stderr.on('data', (data) => {
    const text = data.toString()
    const lines = text.split('\n').filter(l => l.trim())
    for (const line of lines) {
      // Filter out noise
      if (line.includes('ExperimentalWarning') || line.includes('DeprecationWarning')) continue
      emitLog(userId, 'error', line)
    }
  })

  // Handle process exit
  botProcess.on('exit', async (code, signal) => {
    console.log(`[Manager] Bot exited for ${userId} with code ${code}`)
    activeBots.delete(userId)
    
    const exitMsg = code === 0
      ? '✅ Bot stopped cleanly.'
      : `⚠️ Bot exited with code ${code}. You can restart it from the dashboard.`
    
    emitLog(userId, code === 0 ? 'info' : 'warn', exitMsg)
    emitStatus(userId, 'stopped')

    if (supabase) {
      await supabase.from('bot_sessions').update({
        status: 'stopped',
        last_active: new Date().toISOString()
      }).eq('user_id', userId)
    }
  })

  // Handle process errors
  botProcess.on('error', async (err) => {
    console.error(`[Manager] Bot process error for ${userId}:`, err.message)
    emitLog(userId, 'error', `❌ Process error: ${err.message}`)
    emitStatus(userId, 'error')
    activeBots.delete(userId)

    if (supabase) {
      await supabase.from('bot_sessions').update({
        status: 'error',
        last_active: new Date().toISOString()
      }).eq('user_id', userId)
    }
  })

  return { success: true, message: 'Bot starting...' }
}

async function stopBot(userId) {
  const entry = activeBots.get(userId)
  if (!entry) return { error: 'Bot is not running' }

  console.log(`[Manager] Stopping bot for user ${userId}`)
  emitLog(userId, 'info', '🛑 Stopping bot...')

  // Save message count to DB before stopping
  if (supabase) {
    await supabase.from('bot_sessions').update({
      message_count: supabase.rpc('increment_by', { x: entry.messageCount }),
      status: 'stopped'
    }).eq('user_id', userId)
  }

  entry.process.kill('SIGTERM')
  
  // Force kill after 5s if still running
  setTimeout(() => {
    if (activeBots.has(userId)) {
      entry.process.kill('SIGKILL')
      activeBots.delete(userId)
    }
  }, 5000)

  return { success: true }
}

async function restartBot(userId) {
  const entry = activeBots.get(userId)
  const phoneNumber = entry?.phoneNumber

  if (!phoneNumber) {
    // Get from DB
    if (supabase) {
      const { data } = await supabase
        .from('bot_sessions')
        .select('phone_number')
        .eq('user_id', userId)
        .single()
      
      if (data?.phone_number) {
        await stopBot(userId)
        await new Promise(r => setTimeout(r, 2000))
        return startBot(userId, data.phone_number)
      }
    }
    return { error: 'No phone number found. Please start the bot fresh.' }
  }

  emitLog(userId, 'info', '🔄 Restarting bot...')
  await stopBot(userId)
  await new Promise(r => setTimeout(r, 2000))

  if (entry) {
    entry.restartCount++
    if (supabase) {
      await supabase.from('bot_sessions').update({
        restart_count: supabase.rpc('increment', { x: 1 })
      }).eq('user_id', userId)
    }
  }

  return startBot(userId, phoneNumber)
}

function getBotStatus(userId) {
  const entry = activeBots.get(userId)
  if (!entry) return 'stopped'
  return 'running'
}

function getBotInfo(userId) {
  const entry = activeBots.get(userId)
  if (!entry) return null
  return {
    status: 'running',
    uptimeSeconds: Math.floor((Date.now() - entry.startTime) / 1000),
    messageCount: entry.messageCount,
    restartCount: entry.restartCount,
    phoneNumber: entry.phoneNumber,
    logs: entry.logs.slice(-50) // last 50 logs
  }
}

function getRecentLogs(userId) {
  const entry = activeBots.get(userId)
  return entry?.logs || []
}

function getAllStatuses() {
  const result = {}
  for (const [userId, entry] of activeBots) {
    result[userId] = {
      status: 'running',
      uptimeSeconds: Math.floor((Date.now() - entry.startTime) / 1000),
      messageCount: entry.messageCount,
      phoneNumber: entry.phoneNumber
    }
  }
  return result
}

function getActiveCount() {
  return activeBots.size
}

// Admin: force stop any bot
async function adminStopBot(userId) {
  return stopBot(userId)
}

// Admin: force restart any bot
async function adminRestartBot(userId) {
  return restartBot(userId)
}

// Graceful shutdown: stop all bots
async function shutdownAll() {
  console.log('[Manager] Shutting down all bots...')
  for (const [userId] of activeBots) {
    await stopBot(userId)
  }
}

process.on('SIGTERM', shutdownAll)
process.on('SIGINT', shutdownAll)

module.exports = {
  setIo,
  setSupabase,
  startBot,
  stopBot,
  restartBot,
  getBotStatus,
  getBotInfo,
  getRecentLogs,
  getAllStatuses,
  getActiveCount,
  adminStopBot,
  adminRestartBot,
  shutdownAll
}
