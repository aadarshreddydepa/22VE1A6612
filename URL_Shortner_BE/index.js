// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const urlDatabase = new Map();
const clickStats = new Map();

// Logger middleware
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, data);
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  }
};

// Logging middleware
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
};

app.use(loggingMiddleware);

// Utility functions
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const generateShortcode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isShortcodeAvailable = (shortcode) => {
  return !urlDatabase.has(shortcode);
};

const isExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

// POST /shorten - Create shortened URL
app.post('/shorten', (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;
    
    logger.info('URL shortening request received', { url, validity, shortcode });

    // Validate URL
    if (!url || !isValidUrl(url)) {
      logger.warn('Invalid URL provided', { url });
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate validity
    if (validity && (!Number.isInteger(validity) || validity <= 0)) {
      logger.warn('Invalid validity period', { validity });
      return res.status(400).json({ error: 'Validity must be a positive integer' });
    }

    // Generate or validate shortcode
    let finalShortcode = shortcode;
    if (shortcode) {
      if (!isShortcodeAvailable(shortcode)) {
        logger.warn('Shortcode already exists', { shortcode });
        return res.status(400).json({ error: 'Shortcode already exists' });
      }
    } else {
      do {
        finalShortcode = generateShortcode();
      } while (!isShortcodeAvailable(finalShortcode));
    }

    // Calculate expiry time
    const expiryTime = new Date(Date.now() + validity * 60 * 1000);
    
    // Store URL data
    const dataFromURL = {
      originalUrl: url,
      shortcode: finalShortcode,
      createdAt: new Date().toISOString(),
      expiryTime: expiryTime.toISOString(),
      clickCount: 0
    };

    urlDatabase.set(finalShortcode, dataFromURL);
    clickStats.set(finalShortcode, []);

    logger.info('URL shortened successfully', { shortcode: finalShortcode, url });

    res.status(201).json({
      shortlink: `http://localhost:${PORT}/${finalShortcode}`,
      expiry: expiryTime.toISOString()
    });

  } catch (error) {
    logger.error('Error in URL shortening', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:shortcode - Redirect to original URL
app.get('/:shortcode', (req, res) => {
  try {
    const { shortcode } = req.params;
    
    logger.info('Redirect request received', { shortcode });

    const dataFromURL = urlDatabase.get(shortcode);
    
    if (!dataFromURL) {
      logger.warn('Shortcode not found', { shortcode });
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (isExpired(dataFromURL.expiryTime)) {
      logger.warn('Shortcode expired', { shortcode, expiryTime: dataFromURL.expiryTime });
      return res.status(410).json({ error: 'Short URL has expired' });
    }

    // Record click
    dataFromURL.clickCount++;
    const clickData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    clickStats.get(shortcode).push(clickData);
    
    logger.info('Redirect successful', { shortcode, originalUrl: dataFromURL.originalUrl });

    res.redirect(dataFromURL.originalUrl);

  } catch (error) {
    logger.error('Error in redirect', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats - Get all URL statistics
app.get('/api/stats', (req, res) => {
  try {
    logger.info('Statistics request received');

    const stats = Array.from(urlDatabase.entries()).map(([shortcode, dataFromURL]) => {
      const clicks = clickStats.get(shortcode) || [];
      return {
        shortcode,
        shortUrl: `http://localhost:${PORT}/${shortcode}`,
        originalUrl: dataFromURL.originalUrl,
        createdAt: dataFromURL.createdAt,
        expiryTime: dataFromURL.expiryTime,
        clickCount: dataFromURL.clickCount,
        clicks: clicks.map(click => ({
          timestamp: click.timestamp,
          ip: click.ip,
          userAgent: click.userAgent
        })),
        isExpired: isExpired(dataFromURL.expiryTime)
      };
    });

    logger.info('Statistics retrieved successfully', { count: stats.length });
    
    res.json(stats);

  } catch (error) {
    logger.error('Error retrieving statistics', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/:shortcode - Get specific URL statistics
// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`URL Shortener service started on port ${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;