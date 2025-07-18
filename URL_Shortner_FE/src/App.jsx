import React, { useState } from 'react';
import { Copy, BarChart3, Link2, Globe, Calendar, MousePointer, Check } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8080';

const logger = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`, data),
  error: (msg, data) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, data),
  warn: (msg, data) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`, data)
};

const App = () => {
  const [activeTab, setActiveTab] = useState('shorten');
  const [url, setUrl] = useState('');
  const [validity, setValidity] = useState(30);
  const [shortcode, setShortcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [statsCode, setStatsCode] = useState('');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    logger.info('Message shown', { text, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showMessage('Copied to clipboard!');
      logger.info('Text copied to clipboard', { text });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showMessage('Failed to copy to clipboard', 'error');
    }
  };

  const shortenUrl = async () => {
    if (!url.trim()) {
      showMessage('Please enter a URL', 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      showMessage('Please enter a valid URL', 'error');
      return;
    }

    setLoading(true);
    logger.info('Starting URL shortening', { url, validity, shortcode });

    try {
      const response = await fetch(`${API_BASE}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          validity: Number(validity),
          shortcode: shortcode.trim() || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to shorten URL');
      }

      const data = await response.json();
      setResult(data);
      setUrl('');
      setShortcode('');
      showMessage('URL shortened successfully!');
      logger.info('URL shortened successfully', data);

    } catch (error) {
      showMessage(error.message, 'error');
      logger.error('URL shortening failed', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!statsCode.trim()) {
      showMessage('Please enter a shortcode', 'error');
      return;
    }

    setStatsLoading(true);
    logger.info('Fetching statistics', { shortcode: statsCode });

    try {
      const response = await fetch(`${API_BASE}/shorturls/${statsCode.trim()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
      logger.info('Statistics fetched successfully', data);

    } catch (error) {
      showMessage(error.message, 'error');
      logger.error('Statistics fetch failed', { error: error.message });
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="url-shortener">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1 className="title">URL Shortener</h1>
          <p className="subtitle">
            Create short, memorable links in seconds with advanced analytics
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`message ${message.type}`}>
            <div className="message-content">
              <span className="message-text">{message.text}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            onClick={() => setActiveTab('shorten')}
            className={`tab ${activeTab === 'shorten' ? 'active' : ''}`}
          >
            <Link2 size={20} />
            <span className="tab-text">Shorten URL</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span className="tab-text">Statistics</span>
          </button>
        </div>

        {/* Shorten URL Tab */}
        {activeTab === 'shorten' && (
          <div className="card">
            <div className="form-content">
              {/* URL Input */}
              <div className="input-group">
                <Globe className="input-icon" size={20} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, shortenUrl)}
                  placeholder="Enter URL to shorten (e.g., https://example.com)"
                  className="input-field url-input"
                />
              </div>
              
              {/* Validity and Custom Code */}
              <div className="input-row">
                <div className="input-group">
                  <Calendar className="input-icon" size={20} />
                  <input
                    type="number"
                    value={validity}
                    onChange={(e) => setValidity(Math.max(1, e.target.value))}
                    className="input-field validity-input"
                    min="1"
                  />
                  <label className="input-label">Validity (minutes)</label>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    value={shortcode}
                    onChange={(e) => setShortcode(e.target.value)}
                    placeholder="Optional custom code"
                    className="input-field"
                  />
                  <label className="input-label">Custom Code (optional)</label>
                </div>
              </div>
              
              {/* Shorten Button */}
              <button
                onClick={shortenUrl}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <div className="btn-loading">
                    <div className="spinner"></div>
                    Shortening...
                  </div>
                ) : (
                  'Shorten URL'
                )}
              </button>
            </div>

            {/* Result Display */}
            {result && (
              <div className="result-card">
                <h3 className="result-title">
                  <span className="result-icon">✨</span>
                  Your shortened URL:
                </h3>
                <div className="result-content">
                  <code className="result-url">{result.shortlink}</code>
                  <button
                    onClick={() => copyToClipboard(result.shortlink)}
                    className="copy-btn"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={18} className="copy-success" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="result-expiry">
                  <Calendar size={16} />
                  <span>Expires: {formatDate(result.expiry)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="card">
            <div className="form-content">
              {/* Stats Input */}
              <div className="stats-input-row">
                <input
                  type="text"
                  value={statsCode}
                  onChange={(e) => setStatsCode(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, fetchStats)}
                  placeholder="Enter shortcode (e.g., abc123)"
                  className="input-field stats-input"
                />
                <button
                  onClick={fetchStats}
                  disabled={statsLoading}
                  className="btn btn-primary stats-btn"
                >
                  {statsLoading ? (
                    <div className="btn-loading">
                      <div className="spinner"></div>
                      Loading...
                    </div>
                  ) : (
                    'Get Stats'
                  )}
                </button>
              </div>

              {/* Stats Display */}
              {stats && (
                <div className="stats-content">
                  <div className="stats-main">
                    <h3 className="stats-title">
                      <span className="stats-icon">📊</span>
                      URL Statistics
                    </h3>
                    
                    {/* Stats Grid */}
                    <div className="stats-grid">
                      <div className="stat-card">
                        <MousePointer className="stat-icon clicks-icon" size={28} />
                        <p className="stat-label">Total Clicks</p>
                        <p className="stat-value clicks-value">{stats.totalClicks || 0}</p>
                      </div>
                      <div className="stat-card">
                        <Calendar className="stat-icon date-icon" size={28} />
                        <p className="stat-label">Created</p>
                        <p className="stat-value date-value">{formatDate(stats.createdAt)}</p>
                      </div>
                    </div>

                    {/* Original URL */}
                    <div className="original-url">
                      <p className="original-url-label">Original URL:</p>
                      <p className="original-url-value">{stats.originalUrl}</p>
                    </div>

                    {/* Expiry Info */}
                    <div className="stats-expiry">
                      <Calendar size={16} />
                      <span>Expires: {formatDate(stats.expiryDate)}</span>
                    </div>
                  </div>

                  {/* Click History */}
                  {stats.clicks && stats.clicks.length > 0 && (
                    <div className="click-history">
                      <h4 className="click-history-title">
                        <span className="click-history-icon">🕒</span>
                        Recent Clicks ({stats.clicks.length})
                      </h4>
                      <div className="click-list">
                        {stats.clicks.slice(-10).reverse().map((click, index) => (
                          <div key={index} className="click-item">
                            <div className="click-header">
                              <span className="click-time">
                                {new Date(click.timestamp).toLocaleString()}
                              </span>
                              <span className="click-location">
                                {click.location || 'Unknown Location'}
                              </span>
                            </div>
                            {click.referrer && (
                              <p className="click-referrer">
                                <span className="referrer-label">Referrer:</span> {click.referrer}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State for No Clicks */}
                  {stats.clicks && stats.clicks.length === 0 && (
                    <div className="no-clicks">
                      <MousePointer className="no-clicks-icon" size={48} />
                      <p className="no-clicks-title">No clicks yet</p>
                      <p className="no-clicks-subtitle">Share your shortened URL to start tracking clicks!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;