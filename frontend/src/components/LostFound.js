import React, { useState, useEffect } from 'react';
import { searchLostItems, fetchHotspots, reportLostItem } from '../api';
import StationPicker from './StationPicker';

export default function LostFound() {
  const [query, setQuery] = useState('');
  const [station, setStation] = useState('');
  const [results, setResults] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [reportForm, setReportForm] = useState({
    item_name: '',
    description: '',
    quantity: 1,
    station: '',
    type: 'lost',
  });
  const [reportStatus, setReportStatus] = useState('');

  useEffect(() => {
    fetchHotspots().then(setHotspots).catch(() => {});
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchLostItems(query, station);
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      const data = await reportLostItem(reportForm);
      if (data.message) {
        setReportStatus('Report submitted successfully!');
        setReportForm({ item_name: '', description: '', quantity: 1, station: '', type: 'lost' });
      } else {
        setReportStatus('Failed to submit report.');
      }
    } catch {
      setReportStatus('Failed to submit report.');
    }
  };

  return (
    <div className="lf-planner-card">
      {/* Sub tabs header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-light)', marginBottom: '24px' }}>
        <button 
          className={`nav-link ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          style={{ fontSize: '13px', fontWeight: '800', borderBottom: activeTab === 'search' ? '2px solid var(--border)' : 'none', borderRadius: 0 }}
        >
          🔍 Search Items
        </button>
        <button 
          className={`nav-link ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
          style={{ fontSize: '13px', fontWeight: '800', borderBottom: activeTab === 'report' ? '2px solid var(--border)' : 'none', borderRadius: 0 }}
        >
          📝 Report Item
        </button>
        <button 
          className={`nav-link ${activeTab === 'hotspots' ? 'active' : ''}`}
          onClick={() => setActiveTab('hotspots')}
          style={{ fontSize: '13px', fontWeight: '800', borderBottom: activeTab === 'hotspots' ? '2px solid var(--border)' : 'none', borderRadius: 0 }}
        >
          📊 Common Hotspots
        </button>
      </div>

      {activeTab === 'search' && (
        <div>
          <div className="lf-search-bar">
            <div className="lf-form-field">
              <label>Search terms</label>
              <input
                type="text"
                placeholder="e.g. bag, wallet, phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ padding: '12px', background: 'var(--grey-bg)', border: '1px solid var(--grey-light)', borderRadius: '4px', outline: 'none' }}
              />
            </div>
            
            <div className="lf-form-field">
              <label>Station Filter</label>
              <StationPicker
                label=""
                value={station}
                onSelect={setStation}
                placeholder="Filter by station"
              />
            </div>
            
            <button 
              className="btn-primary" 
              onClick={handleSearch} 
              disabled={loading}
              style={{ height: '47px', alignSelf: 'flex-end', justifyContent: 'center' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="lf-results-grid">
            {results.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                Search for lost items across Delhi Metro stations.
              </div>
            )}
            {results.map((item, i) => (
              <div key={i} className="lf-item-card">
                <div className="lf-item-header">
                  <span className="lf-item-name">{item.item_name}</span>
                  <span className={`lf-item-badge-mono ${item.type || 'lost'}`}>
                    {item.type || 'lost'}
                  </span>
                </div>
                <p className="lf-item-desc">{item.description}</p>
                <div className="lf-item-meta-mono">
                  <span>Station: {item.station || item.station_raw}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
                <div className="lf-item-meta-mono" style={{ marginTop: '4px', fontSize: '9px' }}>
                  <span>{item.date} at {item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <form onSubmit={handleReport} className="lf-report-form">
          <div className="lf-form-field">
            <label>Item Type</label>
            <div className="lf-type-toggle">
              <button
                type="button"
                className={`lf-type-btn ${reportForm.type === 'lost' ? 'active' : ''}`}
                onClick={() => setReportForm({ ...reportForm, type: 'lost' })}
              >
                🗑️ Lost
              </button>
              <button
                type="button"
                className={`lf-type-btn ${reportForm.type === 'found' ? 'active' : ''}`}
                onClick={() => setReportForm({ ...reportForm, type: 'found' })}
              >
                🎁 Found
              </button>
            </div>
          </div>
          
          <div className="lf-form-field">
            <label>Item Name</label>
            <input
              type="text"
              value={reportForm.item_name}
              onChange={(e) => setReportForm({ ...reportForm, item_name: e.target.value })}
              placeholder="e.g. Wallet, Bag, Phone"
              required
            />
          </div>
          
          <div className="lf-form-field">
            <label>Description</label>
            <textarea
              value={reportForm.description}
              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              placeholder="Describe details (color, brand, contents, etc.)"
              rows={3}
            />
          </div>
          
          <div className="lf-form-field">
            <label>Station</label>
            <StationPicker
              label=""
              value={reportForm.station}
              onSelect={(s) => setReportForm({ ...reportForm, station: s || '' })}
              placeholder="Where did you lose/find it?"
            />
          </div>
          
          <div className="lf-form-field">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              value={reportForm.quantity}
              onChange={(e) => setReportForm({ ...reportForm, quantity: parseInt(e.target.value) })}
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            Submit Report ↗
          </button>
          
          {reportStatus && (
            <div style={{ marginTop: '12px', padding: '10px', border: '1px solid var(--border)', background: 'var(--yellow-accent)', textAlign: 'center', fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: '700' }}>
              {reportStatus}
            </div>
          )}
        </form>
      )}

      {activeTab === 'hotspots' && (
        <div className="lf-hotspot-list">
          <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px', marginBottom: '20px' }}>
            Most Common Lost-Item Stations (Top Hotspots)
          </h3>
          {hotspots.slice(0, 15).map((h, i) => (
            <div key={i} className="lf-hotspot-row">
              <span className="lf-hotspot-rank-mono">#{i + 1}</span>
              <span className="lf-hotspot-name">{h.station}</span>
              <div className="lf-hotspot-bar-outer">
                <div
                  className="lf-hotspot-bar-inner"
                  style={{ width: `${(h.count / hotspots[0].count) * 100}%` }}
                />
              </div>
              <span className="lf-hotspot-count-mono">{h.count} items</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
