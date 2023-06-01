const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth')
// const { ensureAuth, ensureGuest } = require('../middleware/auth')


router.get('/', authController.getIndex)
router.get('/callback', authController.getCallback)

module.exports = router