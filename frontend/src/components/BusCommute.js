import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

function formatTime(t) {
  if (!t) return '--:--';
  const parts = t.split(':');
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function BusCommute() {
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromStop, setFromStop] = useState(null);
  const [toStop, setToStop] = useState(null);
  const [departure, setDeparture] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const now = new Date();
    setDeparture(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);
    fetch(`${API_BASE}/api/bus/stats`).then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const searchStops = async (query, setSuggestions) => {
    if (query.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/bus/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  };

  const handlePredict = async () => {
    if (!fromStop || !toStop) { setError('Select both stops'); return; }
    setLoading(true);
    setError('');
    setPrediction(null);
    try {
      const dep = departure || new Date().toTimeString().slice(0, 8);
      const res = await fetch(
        `${API_BASE}/api/bus/predict?from=${encodeURIComponent(fromStop.stop_name)}&to=${encodeURIComponent(toStop.stop_name)}&departure=${dep}`
      );
      const data = await res.json();
      // Accept direct OR connecting results
      if (data.best_prediction || (data.connecting_routes && data.connecting_routes.length > 0)) {
        setPrediction(data);
      } else {
        setError(data.message || 'No bus routes found between these stops');
      }
    } catch {
      setError('Failed to fetch bus predictions');
    }
    setLoading(false);
  };

  return (
    <div className="bus-planner-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '20px' }}>🚌 Delhi Bus Commute</h2>
        {stats && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', border: '1px solid var(--grey-light)', padding: '2px 8px', borderRadius: '2px' }}>
              {stats.total_routes} Routes
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', border: '1px solid var(--grey-light)', padding: '2px 8px', borderRadius: '2px' }}>
              {stats.total_stops} Stops
            </span>
          </div>
        )}
      </div>

      <div className="bus-form-grid">
        <div className="bus-input-container">
          <label>From Stop</label>
          <input
            type="text"
            className="bus-input-field"
            value={fromQuery}
            onChange={(e) => {
              setFromQuery(e.target.value);
              setFromStop(null);
              searchStops(e.target.value, setFromSuggestions);
            }}
            placeholder="Search origin bus stop..."
          />
          {fromSuggestions.length > 0 && !fromStop && (
            <ul className="bus-suggestions-list">
              {fromSuggestions.map((s, i) => (
                <li 
                  key={i} 
                  className="bus-suggestion-item"
                  onClick={() => {
                    setFromStop(s);
                    setFromQuery(s.stop_name);
                    setFromSuggestions([]);
                  }}
                >
                  <span className="bus-suggestion-name">{s.stop_name}</span>
                  <span className="bus-suggestion-routes-mono">{s.routes.length} routes</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bus-input-container">
          <label>To Stop</label>
          <input
            type="text"
            className="bus-input-field"
            value={toQuery}
            onChange={(e) => {
              setToQuery(e.target.value);
              setToStop(null);
              searchStops(e.target.value, setToSuggestions);
            }}
            placeholder="Search destination bus stop..."
          />
          {toSuggestions.length > 0 && !toStop && (
            <ul className="bus-suggestions-list">
              {toSuggestions.map((s, i) => (
                <li 
                  key={i} 
                  className="bus-suggestion-item"
                  onClick={() => {
                    setToStop(s);
                    setToQuery(s.stop_name);
                    setToSuggestions([]);
                  }}
                >
                  <span className="bus-suggestion-name">{s.stop_name}</span>
                  <span className="bus-suggestion-routes-mono">{s.routes.length} routes</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bus-input-container">
          <label>Departure Time</label>
          <input
            type="time"
            className="bus-input-field"
            value={departure.slice(0, 5)}
            onChange={(e) => setDeparture(e.target.value + ':00')}
          />
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handlePredict}
        disabled={loading || !fromStop || !toStop}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Running Predictions...' : 'Predict DTC Bus Arrival ↗'}
      </button>

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#ffebeb', border: '1px solid #ff2d55', color: '#ff2d55', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {prediction && prediction.route_type === 'direct' && prediction.best_prediction && (
        <div className="bus-predictions-container">
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px' }}>
              🎯 Direct Bus: {prediction.from} → {prediction.to}
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#34c759' }}>DIRECT ROUTE</span>
          </div>

          <div className="bus-prediction-main">
            <div className="bus-prediction-header">
              <span className="bus-prediction-route">DTC Route #{prediction.best_prediction.route_id}</span>
              <span className="bus-confidence-badge-mono" style={{ background: prediction.best_prediction.confidence === 'high' ? '#34c759' : '#ff9500', color: '#fff', border: 'none' }}>
                {prediction.best_prediction.confidence} Confidence
              </span>
            </div>
            <div className="bus-timeline-grid">
              <div className="bus-timeline-line" />
              <div className="bus-timeline-node">
                <div className="bus-node-dot active" />
                <span className="bus-node-name">{prediction.from}</span>
                <span className="bus-node-time-mono">{formatTime(prediction.best_prediction.departure)}</span>
              </div>
              <div className="bus-journey-duration">⏳ {prediction.best_prediction.duration_min} min ride · {prediction.best_prediction.stops_between} stops</div>
              <div className="bus-timeline-node">
                <div className="bus-node-dot active" />
                <span className="bus-node-name">{prediction.to}</span>
                <span className="bus-node-time-mono">{formatTime(prediction.best_prediction.arrival)}</span>
              </div>
            </div>
            <div className="bus-prediction-meta">
              <span>⏱️ Wait: {prediction.best_prediction.wait_min} min</span>
              <span>•</span>
              <span>🚏 Total journey: {prediction.best_prediction.total_journey_min} min</span>
            </div>
          </div>

          {prediction.alternatives && prediction.alternatives.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '14px', marginBottom: '12px' }}>Alternative Services</h4>
              <div className="bus-alternatives-list">
                {prediction.alternatives.map((alt, i) => (
                  <div key={i} className="bus-alt-card">
                    <span className="bus-alt-route">Route #{alt.route_id}</span>
                    <span className="bus-alt-times">{formatTime(alt.departure)} → {formatTime(alt.arrival)}</span>
                    <div className="bus-alt-meta">⏱️ {alt.duration_min}m · Wait {alt.wait_min}m</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {prediction && prediction.route_type === 'connecting' && prediction.connecting_routes && (
        <div className="bus-predictions-container">
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px' }}>
              🔄 Connecting Routes: {prediction.from} → {prediction.to}
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ff9500' }}>
              {prediction.message}
            </span>
          </div>

          {prediction.connecting_routes.map((conn, i) => (
            <div key={i} style={{
              border: '1px solid var(--grey-light)', borderRadius: '6px',
              padding: '16px', marginBottom: '12px',
              background: i === 0 ? 'rgba(0,102,204,0.04)' : 'var(--white)'
            }}>
              {i === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#0066CC', marginBottom: '10px', fontWeight: '700' }}>BEST OPTION</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '13px' }}>⏱️ Total: {conn.total_duration_min} min</span>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>1 Transfer</span>
              </div>

              {/* Leg 1 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0066CC', flexShrink: 0 }} />
                  <div style={{ width: '2px', height: '30px', background: '#0066CC', opacity: 0.4 }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF9500', border: '2px solid #FF9500', flexShrink: 0 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '700' }}>
                    Bus #{conn.leg1.route_id}: {conn.leg1.from_stop} → {conn.leg1.to_stop}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {formatTime(conn.leg1.departure)} → {formatTime(conn.leg1.arrival)} · {conn.leg1.duration_min} min · {conn.leg1.stops_between} stops
                  </div>
                </div>
              </div>

              {/* Transfer badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', borderRadius: '20px', margin: '4px 0 8px 20px',
                background: '#fff3cd', border: '1px solid #ffc107',
                fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: '700', color: '#856404'
              }}>
                🔄 Transfer at {conn.leg1.to_stop}
                {conn.transfer_wait_min > 0 && ` · Wait ~${conn.transfer_wait_min} min`}
              </div>

              {/* Leg 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF9500', flexShrink: 0 }} />
                  <div style={{ width: '2px', height: '30px', background: '#34c759', opacity: 0.4 }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34c759', flexShrink: 0 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '700' }}>
                    Bus #{conn.leg2.route_id}: {conn.leg2.from_stop} → {conn.leg2.to_stop}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {formatTime(conn.leg2.departure)} → {formatTime(conn.leg2.arrival)} · {conn.leg2.duration_min} min · {conn.leg2.stops_between} stops
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
