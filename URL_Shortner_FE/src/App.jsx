import React, { useState } from 'react';
import { Copy, BarChart3, Link2 } from 'lucide-react';

const API_BASE = 'http://localhost:8080';

// Custom Logger (as per requirements)
const logger = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`, data),
  error: (msg, data) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, data),
  warn: (msg, data) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`, data)
};

const URLShortener = () => {
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

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    logger.info('Message shown', { text, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard!');
    logger.info('Text copied to clipboard', { text });
  };

  const shortenUrl = async () => {
    if (!url) {
      showMessage('Please enter a URL', 'error');
      return;
    }

    setLoading(true);
    logger.info('Starting URL shortening', { url, validity, shortcode });

    try {
      const response = await fetch(`${API_BASE}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          validity: Number(validity),
          shortcode: shortcode || undefined
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
    if (!statsCode) {
      showMessage('Please enter a shortcode', 'error');
      return;
    }

    setStatsLoading(true);
    logger.info('Fetching statistics', { shortcode: statsCode });

    try {
      const response = await fetch(`${API_BASE}/shorturls/${statsCode}`);
      
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

  const formatDate = (date) => new Date(date).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">URL Shortener</h1>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('shorten')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-l-lg ${
              activeTab === 'shorten' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Link2 size={18} />
            Shorten URL
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-r-lg ${
              activeTab === 'stats' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={18} />
            Statistics
          </button>
        </div>

        {/* Shorten URL Tab */}
        {activeTab === 'shorten' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="space-y-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to shorten"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="flex gap-4">
                <input
                  type="number"
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  placeholder="Validity (minutes)"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <input
                  type="text"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder="Custom code (optional)"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={shortenUrl}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Shortening...' : 'Shorten URL'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Shortened URL:</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-sm flex-1">
                    {result.shortlink}
                  </code>
                  <button
                    onClick={() => copyToClipboard(result.shortlink)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Expires: {formatDate(result.expiry)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={statsCode}
                  onChange={(e) => setStatsCode(e.target.value)}
                  placeholder="Enter shortcode"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchStats}
                  disabled={statsLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {statsLoading ? 'Loading...' : 'Get Stats'}
                </button>
              </div>

              {/* Stats Display */}
              {stats && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">URL Statistics</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Clicks</p>
                        <p className="text-2xl font-bold">{stats.totalClicks || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created</p>
                        <p>{formatDate(stats.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-gray-600 text-sm">Original URL:</p>
                      <p className="text-sm break-all">{stats.originalUrl}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Expires: {formatDate(stats.expiryDate)}
                    </p>
                  </div>

                  {/* Click History */}
                  {stats.clicks && stats.clicks.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-3">Recent Clicks</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stats.clicks.slice(-10).map((click, index) => (
                          <div key={index} className="text-sm p-2 bg-white rounded">
                            <div className="flex justify-between">
                              <span>{new Date(click.timestamp).toLocaleString()}</span>
                              <span className="text-gray-600">{click.location || 'Unknown'}</span>
                            </div>
                            {click.referrer && (
                              <p className="text-xs text-gray-500 mt-1">From: {click.referrer}</p>
                            )}
                          </div>
                        ))}
                      </div>
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

export default URLShortener;