const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const urlDatabase = new Map();
const clickStats = new Map();

// Simple logger
const logger = {
  info: (message, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data),
  error: (message, data = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, data),
  warn: (message, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data)
};

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Utility functions
const isValidUrl = (url) => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
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

const isShortcodeAvailable = (shortcode) => !urlDatabase.has(shortcode);

const isExpired = (expiryTime) => new Date() > new Date(expiryTime);

// Clean up expired URLs (runs every 5 minutes)
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [shortcode, data] of urlDatabase.entries()) {
    if (isExpired(data.expiryTime)) {
      urlDatabase.delete(shortcode);
      clickStats.delete(shortcode);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired URLs`);
  }
}, 5 * 60 * 1000);

// Routes

// POST /shorten - Create shortened URL
app.post('/shorten', (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;
    
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Please provide a valid URL (must start with http:// or https://)' });
    }

    // Validate validity period
    const validityNum = Number(validity);
    if (!validityNum || validityNum <= 0 || validityNum > 525600) { // Max 1 year
      return res.status(400).json({ error: 'Validity must be between 1 and 525600 minutes' });
    }

    // Validate custom shortcode
    if (shortcode) {
      if (shortcode.length < 3 || shortcode.length > 10) {
        return res.status(400).json({ error: 'Custom shortcode must be 3-10 characters long' });
      }
      if (!/^[a-zA-Z0-9]+$/.test(shortcode)) {
        return res.status(400).json({ error: 'Custom shortcode can only contain letters and numbers' });
      }
      if (!isShortcodeAvailable(shortcode)) {
        return res.status(400).json({ error: 'This shortcode is already taken' });
      }
    }

    // Generate shortcode if not provided
    let finalShortcode = shortcode;
    if (!shortcode) {
      do {
        finalShortcode = generateShortcode();
      } while (!isShortcodeAvailable(finalShortcode));
    }

    // Calculate expiry time
    const expiryTime = new Date(Date.now() + validityNum * 60 * 1000);
    
    // Store URL data
    const urlData = {
      originalUrl: url,
      shortcode: finalShortcode,
      createdAt: new Date().toISOString(),
      expiryTime: expiryTime.toISOString(),
      clickCount: 0
    };

    urlDatabase.set(finalShortcode, urlData);
    clickStats.set(finalShortcode, []);

    logger.info('URL shortened successfully', { shortcode: finalShortcode, url });

    res.status(201).json({
      shortlink: `http://localhost:${PORT}/${finalShortcode}`,
      shortcode: finalShortcode,
      expiry: expiryTime.toISOString()
    });

  } catch (error) {
    logger.error('Error in URL shortening', { error: error.message });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /:shortcode - Redirect to original URL
app.get('/:shortcode', (req, res) => {
  try {
    const { shortcode } = req.params;
    
    // Skip API routes
    if (shortcode.startsWith('api') || shortcode.startsWith('shorturls')) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    const urlData = urlDatabase.get(shortcode);
    
    if (!urlData) {
      logger.warn('Shortcode not found', { shortcode });
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (isExpired(urlData.expiryTime)) {
      logger.warn('Shortcode expired', { shortcode });
      urlDatabase.delete(shortcode);
      clickStats.delete(shortcode);
      return res.status(410).json({ error: 'This short URL has expired' });
    }

    // Record click
    urlData.clickCount++;
    const clickData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      location: req.get('CF-IPCountry') || 'Unknown' // Cloudflare country header
    };
    
    clickStats.get(shortcode).push(clickData);
    
    logger.info('Redirect successful', { shortcode, originalUrl: urlData.originalUrl });

    res.redirect(urlData.originalUrl);

  } catch (error) {
    logger.error('Error in redirect', { error: error.message });
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /shorturls/:shortcode - Get specific URL statistics (for frontend)
app.get('/shorturls/:shortcode', (req, res) => {
  try {
    const { shortcode } = req.params;
    
    const urlData = urlDatabase.get(shortcode);
    
    if (!urlData) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const clicks = clickStats.get(shortcode) || [];
    
    const stats = {
      shortcode,
      shortUrl: `http://localhost:${PORT}/${shortcode}`,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt,
      expiryDate: urlData.expiryTime,
      totalClicks: urlData.clickCount,
      clicks: clicks.map(click => ({
        timestamp: click.timestamp,
        location: click.location,
        referrer: click.referrer
      })),
      isExpired: isExpired(urlData.expiryTime)
    };

    logger.info('Statistics retrieved for shortcode', { shortcode });
    res.json(stats);

  } catch (error) {
    logger.error('Error retrieving statistics', { error: error.message });
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/stats - Get all URL statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = Array.from(urlDatabase.entries()).map(([shortcode, urlData]) => {
      const clicks = clickStats.get(shortcode) || [];
      return {
        shortcode,
        shortUrl: `http://localhost:${PORT}/${shortcode}`,
        originalUrl: urlData.originalUrl,
        createdAt: urlData.createdAt,
        expiryTime: urlData.expiryTime,
        totalClicks: urlData.clickCount,
        clicksCount: clicks.length,
        isExpired: isExpired(urlData.expiryTime)
      };
    });

    logger.info('All statistics retrieved', { count: stats.length });
    res.json(stats);

  } catch (error) {
    logger.error('Error retrieving all statistics', { error: error.message });
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    totalUrls: urlDatabase.size,
    uptime: process.uptime()
  });
});

// GET /api/routes - List all available API routes
app.get('/api/routes', (req, res) => {
  const routes = [
    { method: 'GET', path: '/api/health', description: 'Health check' },
    { method: 'GET', path: '/api/stats', description: 'Get all URL statistics' },
    { method: 'GET', path: '/api/routes', description: 'List all API routes' },
    { method: 'POST', path: '/shorten', description: 'Create a short URL' },
    { method: 'GET', path: '/shorturls/:shortcode', description: 'Get statistics for specific shortcode' },
    { method: 'GET', path: '/:shortcode', description: 'Redirect to original URL' }
  ];
  
  res.json({
    totalRoutes: routes.length,
    baseUrl: `http://localhost:${PORT}`,
    routes
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Something went wrong' });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`URL Shortener service started on port ${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;