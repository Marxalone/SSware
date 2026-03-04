require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')

const botRoutes = require('./routes/bot')
const adminRoutes = require('./routes/admin')
const authMiddleware = require('./middleware/auth')
const adminMiddleware = require('./middleware/admin')
const processManager = require('./manager/processManager')

const app = express()
const server = http.createServer(app)

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))
app.use(express.json())

// Make io and supabase available to routes
app.set('io', io)
app.set('supabase', supabase)
processManager.setIo(io)
processManager.setSupabase(supabase)

// Health check (no auth needed)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeBots: processManager.getActiveCount(),
    timestamp: new Date().toISOString()
  })
})

// Routes
app.use('/api/bot', authMiddleware, botRoutes)
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes)

// Socket.io authentication + connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('No token'))

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return next(new Error('Invalid token'))

    socket.userId = user.id
    socket.userEmail = user.email

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    socket.isAdmin = profile?.role === 'admin'
    next()
  } catch (err) {
    next(new Error('Auth failed'))
  }
})

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.userId}`)

  // Join personal room for bot logs
  socket.join(`user:${socket.userId}`)

  // Admins join admin room
  if (socket.isAdmin) {
    socket.join('admin')
    console.log(`[Socket] Admin joined admin room: ${socket.userEmail}`)
  }

  // Send current bot status on connect
  const status = processManager.getBotStatus(socket.userId)
  socket.emit('bot:status', { status })

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.userId}`)
  })
})

// Cron: Save analytics snapshot every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const allStatuses = processManager.getAllStatuses()
    const activeSessions = Object.values(allStatuses).filter(s => s.status === 'running').length

    const { data: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const { data: msgData } = await supabase
      .from('bot_sessions')
      .select('message_count')

    const totalMessages = msgData?.reduce((acc, s) => acc + (s.message_count || 0), 0) || 0

    const { data: runtimeData } = await supabase
      .from('bot_sessions')
      .select('total_runtime_seconds')

    const totalRuntimeHours = Math.floor(
      (runtimeData?.reduce((acc, s) => acc + (s.total_runtime_seconds || 0), 0) || 0) / 3600
    )

    await supabase.from('analytics_snapshots').insert({
      total_users: userCount?.length || 0,
      active_sessions: activeSessions,
      total_messages: totalMessages,
      total_runtime_hours: totalRuntimeHours
    })

    console.log('[Cron] Analytics snapshot saved')
  } catch (err) {
    console.error('[Cron] Analytics error:', err.message)
  }
})

// Cron: Update runtime for all active bots every minute
cron.schedule('* * * * *', async () => {
  try {
    const allStatuses = processManager.getAllStatuses()
    for (const [userId, info] of Object.entries(allStatuses)) {
      if (info.status === 'running') {
        await supabase
          .from('bot_sessions')
          .update({
            total_runtime_seconds: supabase.rpc('increment', { x: 60 }),
            last_active: new Date().toISOString()
          })
          .eq('user_id', userId)
      }
    }
  } catch (err) {
    // Silent fail for runtime updates
  }
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n🚀 Samuell Server running on port ${PORT}`)
  console.log(`📡 Socket.io ready`)
  console.log(`🤖 Bot directory: ${process.env.BOT_DIR || './bot'}`)
  console.log(`📁 Sessions directory: ${process.env.SESSIONS_DIR || './sessions'}\n`)
})

module.exports = { app, io, supabase }
