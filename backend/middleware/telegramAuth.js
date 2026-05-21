const crypto = require('crypto');
const { isDemoMode } = require('../config/supabase');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'mock_bot_token';

/**
 * Verifies Telegram WebApp initData integrity
 * @param {string} initDataRaw Query string from window.Telegram.WebApp.initData
 * @param {string} botToken Telegram Bot Token
 * @returns {boolean} Whether the data is authentic
 */
function verifyTelegramInitData(initDataRaw, botToken) {
  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;

    // Separate all parameters except hash and sort them alphabetically
    const keys = [];
    for (const [key, value] of urlParams.entries()) {
      if (key !== 'hash') {
        keys.push(`${key}=${value}`);
      }
    }
    keys.sort();
    const dataCheckString = keys.join('\n');

    // HMAC verification according to Telegram documentation
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (err) {
    console.error('Error verifying Telegram initData:', err);
    return false;
  }
}

/**
 * Express middleware to validate Telegram TMA request
 */
const validateTelegramRequest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  // Format: "Telegram initDataRawString" or "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() === 'telegram') {
    const isValid = verifyTelegramInitData(token, BOT_TOKEN);

    if (!isValid) {
      if (isDemoMode) {
        console.log('⚠️ Telegram verification failed. Demo mode enabled, bypassing validation for testing.');
        // Parse user data anyway from the query string
        try {
          const urlParams = new URLSearchParams(token);
          const userJson = urlParams.get('user');
          req.telegramUser = JSON.parse(userJson);
          return next();
        } catch (e) {
          // If we can't parse, supply a default test user
          req.telegramUser = { id: 12345678, first_name: 'Demo User', username: 'demo_user' };
          return next();
        }
      }
      return res.status(403).json({ error: 'Telegram authentication failed. Invalid signatures.' });
    }

    // Authenticated successfully. Parse user object
    try {
      const urlParams = new URLSearchParams(token);
      const userJson = urlParams.get('user');
      req.telegramUser = JSON.parse(userJson);
      next();
    } catch (e) {
      res.status(400).json({ error: 'Failed to parse user data from Telegram' });
    }
  } else if (scheme.toLowerCase() === 'bearer') {
    // If it's a bearer token (for Admin Panel verification, etc.)
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.adminUser = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired admin token' });
    }
  } else {
    res.status(401).json({ error: 'Unsupported authorization scheme' });
  }
};

module.exports = {
  validateTelegramRequest,
  verifyTelegramInitData
};
