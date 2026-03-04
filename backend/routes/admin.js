const express = require('express')
const router = express.Router()
const processManager = require('../manager/processManager')

// GET /api/admin/overview - full system overview
router.get('/overview', async (req, res) => {
  try {
    const supabase = req.app.get('supabase')
    const allStatuses = processManager.getAllStatuses()
    const activeSessions = Object.keys(allStatuses).length

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // All bot sessions
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('*')
      .order('last_active', { ascending: false })

    const totalMessages = sessions?.reduce((acc, s) => acc + (s.message_count || 0), 0) || 0
    const totalRuntimeHours = Math.floor(
      (sessions?.reduce((acc, s) => acc + (s.total_runtime_seconds || 0), 0) || 0) / 3600
    )
    const totalRestarts = sessions?.reduce((acc, s) => acc + (s.restart_count || 0), 0) || 0

    // Recent analytics snapshots
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(30)

    res.json({
      overview: {
        totalUsers: totalUsers || 0,
        activeSessions,
        totalMessages,
        totalRuntimeHours,
        totalRestarts,
        serverUptime: Math.floor(process.uptime())
      },
      liveBots: allStatuses,
      sessions: sessions || [],
      snapshots: snapshots || []
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/users - all users with their bot status
router.get('/users', async (req, res) => {
  try {
    const supabase = req.app.get('supabase')
    const allStatuses = processManager.getAllStatuses()

    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        *,
        bot_sessions (*)
      `)
      .order('created_at', { ascending: false })

    // Merge live status
    const users = (profiles || []).map(p => ({
      ...p,
      liveStatus: allStatuses[p.id] || null
    }))

    res.json({ users })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/bot/:userId/stop - force stop any bot
router.post('/bot/:userId/stop', async (req, res) => {
  try {
    const result = await processManager.adminStopBot(req.params.userId)
    if (result.error) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/bot/:userId/restart - force restart any bot
router.post('/bot/:userId/restart', async (req, res) => {
  try {
    const result = await processManager.adminRestartBot(req.params.userId)
    if (result.error) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/bot/stopall - stop all running bots
router.post('/bot/stopall', async (req, res) => {
  try {
    const allStatuses = processManager.getAllStatuses()
    const results = []
    for (const userId of Object.keys(allStatuses)) {
      const result = await processManager.adminStopBot(userId)
      results.push({ userId, ...result })
    }
    res.json({ results, stopped: results.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/admin/user/:userId/role - change user role
router.put('/user/:userId/role', async (req, res) => {
  try {
    const supabase = req.app.get('supabase')
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user or admin.' })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.params.userId)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, role })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/user/:userId - delete user and their session
router.delete('/user/:userId', async (req, res) => {
  try {
    const supabase = req.app.get('supabase')
    const userId = req.params.userId

    // Stop their bot if running
    await processManager.adminStopBot(userId)

    // Delete from DB
    await supabase.from('bot_logs').delete().eq('user_id', userId)
    await supabase.from('bot_sessions').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/logs/:userId - get logs for a specific user
router.get('/logs/:userId', (req, res) => {
  try {
    const logs = processManager.getRecentLogs(req.params.userId)
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
