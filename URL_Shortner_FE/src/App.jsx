import React, { useState } from 'react';
import { Copy, BarChart3, Link2, Globe, Calendar, MousePointer } from 'lucide-react';

const API_BASE = 'http://localhost:8080';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            URL Shortener
          </h1>
          <p className="text-gray-600 text-lg">Create short, memorable links in seconds</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center shadow-lg transform animate-pulse ${
            message.type === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-700' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex mb-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('shorten')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 transition-all duration-300 ${
              activeTab === 'shorten' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Link2 size={20} />
            <span className="font-semibold">Shorten URL</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 transition-all duration-300 ${
              activeTab === 'stats' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={20} />
            <span className="font-semibold">Statistics</span>
          </button>
        </div>

        {/* Shorten URL Tab */}
        {activeTab === 'shorten' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="space-y-6">
              <div className="relative">
                <Globe className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to shorten (e.g., https://example.com)"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={validity}
                    onChange={(e) => setValidity(e.target.value)}
                    placeholder="Validity (minutes)"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                    min="1"
                  />
                </div>
                <input
                  type="text"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder="Custom code (optional)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                />
              </div>
              
              <button
                onClick={shortenUrl}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                {loading ? 'Shortening...' : 'Shorten URL'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200">
                <h3 className="font-bold text-lg mb-4 text-gray-800">✨ Your shortened URL:</h3>
                <div className="flex items-center gap-3 mb-4">
                  <code className="bg-white px-4 py-2 rounded-lg text-sm flex-1 border shadow-sm">
                    {result.shortlink}
                  </code>
                  <button
                    onClick={() => copyToClipboard(result.shortlink)}
                    className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar size={16} />
                  Expires: {formatDate(result.expiry)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={statsCode}
                  onChange={(e) => setStatsCode(e.target.value)}
                  placeholder="Enter shortcode"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                />
                <button
                  onClick={fetchStats}
                  disabled={statsLoading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all duration-300 shadow-lg"
                >
                  {statsLoading ? 'Loading...' : 'Get Stats'}
                </button>
              </div>

              {/* Stats Display */}
              {stats && (
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">📊 URL Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <MousePointer className="mx-auto mb-2 text-blue-500" size={24} />
                        <p className="text-gray-600 text-sm">Total Clicks</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.totalClicks || 0}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <Calendar className="mx-auto mb-2 text-green-500" size={24} />
                        <p className="text-gray-600 text-sm">Created</p>
                        <p className="font-semibold text-green-600">{formatDate(stats.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
                      <p className="text-gray-600 text-sm mb-2">Original URL:</p>
                      <p className="text-sm break-all font-mono bg-gray-50 p-2 rounded">{stats.originalUrl}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 flex items-center gap-2">
                      <Calendar size={16} />
                      Expires: {formatDate(stats.expiryDate)}
                    </p>
                  </div>

                  {/* Click History */}
                  {stats.clicks && stats.clicks.length > 0 && (
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                      <h4 className="font-bold text-lg mb-4 text-gray-800">🕒 Recent Clicks</h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.clicks.slice(-10).map((click, index) => (
                          <div key={index} className="p-3 bg-white rounded-xl shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <span className="font-medium text-gray-800">{new Date(click.timestamp).toLocaleString()}</span>
                              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{click.location || 'Unknown'}</span>
                            </div>
                            {click.referrer && (
                              <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">From: {click.referrer}</p>
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