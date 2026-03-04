const express = require('express')
const router = express.Router()
const processManager = require('../manager/processManager')

// GET /api/bot/status - get current bot status
router.get('/status', async (req, res) => {
  try {
    const supabase = req.app.get('supabase')
    const userId = req.userId

    const info = processManager.getBotInfo(userId)
    
    // Also get DB data
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', userId)
      .single()

    res.json({
      running: !!info,
      live: info || null,
      session: session || null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bot/logs - get recent logs
router.get('/logs', (req, res) => {
  try {
    const logs = processManager.getRecentLogs(req.userId)
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/bot/start - start bot
router.post('/start', async (req, res) => {
  try {
    const { phoneNumber } = req.body
    const userId = req.userId

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }

    const result = await processManager.startBot(userId, cleanPhone)
    
    if (result.error) {
      return res.status(400).json(result)
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/bot/stop - stop bot
router.post('/stop', async (req, res) => {
  try {
    const result = await processManager.stopBot(req.userId)
    if (result.error) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/bot/restart - restart bot
router.post('/restart', async (req, res) => {
  try {
    const result = await processManager.restartBot(req.userId)
    if (result.error) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
