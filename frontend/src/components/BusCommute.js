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
  const [showAllStops, setShowAllStops] = useState(false);

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
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    }
  };

  const handlePredict = async () => {
    if (!fromStop || !toStop) { setError('Select both stops'); return; }
    setLoading(true);
    setError('');
    setPrediction(null);
    setShowAllStops(false);
    try {
      const dep = departure || new Date().toTimeString().slice(0, 8);
      const res = await fetch(
        `${API_BASE}/api/bus/predict?from=${encodeURIComponent(fromStop.stop_name)}&to=${encodeURIComponent(toStop.stop_name)}&departure=${dep}`
      );
      const data = await res.json();
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

  const StopTimeline = ({ stops, color, showAll }) => {
    const displayStops = showAll ? stops : stops;
    if (!displayStops || displayStops.length === 0) return null;
    return (
      <div style={{ padding: '12px 0 4px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {displayStops.map((stop, i) => {
            const isFirst = i === 0;
            const isLast = i === displayStops.length - 1;
            const isKey = isFirst || isLast;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: '12px', minHeight: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                    background: isKey ? color : '#ccc',
                    border: isKey ? `2px solid ${color}` : '2px solid #ddd',
                    marginTop: '6px',
                  }} />
                  {i < displayStops.length - 1 && (
                    <div style={{ width: '2px', flex: 1, background: `${color}44`, minHeight: '12px' }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: '4px' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', borderRadius: '4px',
                    background: isKey ? `${color}12` : 'transparent',
                    borderLeft: isKey ? `3px solid ${color}` : '3px solid transparent',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: isKey ? '700' : '500',
                      color: 'var(--text)',
                    }}>
                      {isFirst && '🚌 '}{stop.name}{isLast && ' 🏁'}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', whiteSpace: 'nowrap',
                    }}>
                      {formatTime(stop.time)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bus-planner-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '20px' }}>🚌 Delhi DTC Bus Commute</h2>
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
              {fromSuggestions.slice(0, 8).map((s, i) => (
                <li key={i} className="bus-suggestion-item" onClick={() => {
                  setFromStop(s);
                  setFromQuery(s.stop_name);
                  setFromSuggestions([]);
                }}>
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
              {toSuggestions.slice(0, 8).map((s, i) => (
                <li key={i} className="bus-suggestion-item" onClick={() => {
                  setToStop(s);
                  setToQuery(s.stop_name);
                  setToSuggestions([]);
                }}>
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
        {loading ? 'Searching DTC Routes...' : 'Find Connected DTC Route ↗'}
      </button>

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#ffebeb', border: '1px solid #ff2d55', color: '#ff2d55', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* DIRECT ROUTE RESULT */}
      {prediction && prediction.route_type === 'direct' && prediction.best_prediction && (
        <div className="bus-predictions-container" style={{ marginTop: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px' }}>
              🎯 Direct DTC Bus: {prediction.from} → {prediction.to}
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#34c759', fontWeight: '700' }}>DIRECT ROUTE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                Route #{prediction.best_prediction.route_id} · {prediction.best_prediction.stops_between} stops
              </span>
            </div>
          </div>

          {/* Journey summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'WAIT', value: `${prediction.best_prediction.wait_min}m`, icon: '⏱️', color: '#ff9500' },
              { label: 'RIDE', value: `${prediction.best_prediction.duration_min}m`, icon: '🚌', color: '#0066CC' },
              { label: 'TOTAL', value: `${prediction.best_prediction.total_journey_min}m`, icon: '🗓️', color: '#34c759' },
              { label: 'STOPS', value: prediction.best_prediction.stops_between, icon: '🚏', color: '#9933CC' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 12px', borderRadius: '6px',
                border: `1px solid ${item.color}33`, background: `${item.color}08`,
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '4px' }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '18px', color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Departure / Arrival times */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--grey-light)',
            background: 'var(--grey-bg)', marginBottom: '16px',
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>DEPART</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px', color: 'var(--text)' }}>{formatTime(prediction.best_prediction.departure)}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-dim)' }}>{prediction.from}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
              {'─'.repeat(6)} 🚌 {'─'.repeat(6)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>ARRIVE</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px', color: 'var(--text)' }}>{formatTime(prediction.best_prediction.arrival)}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-dim)' }}>{prediction.to}</div>
            </div>
          </div>

          {/* Connected stops timeline */}
          {prediction.best_prediction.stops && prediction.best_prediction.stops.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#0066CC0D', borderRadius: '6px 6px 0 0',
                border: '1px solid #0066CC22', borderBottom: 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '13px', color: 'var(--text)' }}>
                  📍 Connected Route — {prediction.best_prediction.stops.length} stops
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                  {prediction.best_prediction.route_id}
                </span>
              </div>
              <div style={{
                border: '1px solid var(--grey-light)', borderRadius: '0 0 6px 6px',
                padding: '4px 8px', maxHeight: showAllStops ? '600px' : '220px',
                overflowY: 'auto', transition: 'max-height 0.3s ease',
              }}>
                <StopTimeline stops={prediction.best_prediction.stops} color="#0066CC" showAll={showAllStops} />
              </div>
              {prediction.best_prediction.stops.length > 6 && (
                <button
                  onClick={() => setShowAllStops(!showAllStops)}
                  style={{
                    marginTop: '8px', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--grey-light)',
                    background: 'var(--white)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px',
                    color: 'var(--text-dim)', width: '100%', textAlign: 'center',
                  }}
                >
                  {showAllStops ? '▲ Show fewer stops' : `▼ Show all ${prediction.best_prediction.stops.length} stops`}
                </button>
              )}
            </div>
          )}

          {/* Alternatives */}
          {prediction.alternatives && prediction.alternatives.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '14px', marginBottom: '12px' }}>🔄 Alternative DTC Services</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {prediction.alternatives.map((alt, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--grey-light)',
                    background: 'var(--white)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700',
                        padding: '3px 8px', borderRadius: '4px',
                        background: '#0066CC12', color: '#0066CC',
                      }}>#{alt.route_id}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text)' }}>
                        {formatTime(alt.departure)} → {formatTime(alt.arrival)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>⏱️ {alt.duration_min}m</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>🚏 {alt.stops_between}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: '700',
                        padding: '2px 6px', borderRadius: '3px',
                        background: alt.confidence === 'high' ? '#34c75918' : alt.confidence === 'medium' ? '#ff950018' : '#ff2d5518',
                        color: alt.confidence === 'high' ? '#34c759' : alt.confidence === 'medium' ? '#ff9500' : '#ff2d55',
                      }}>{alt.confidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONNECTING ROUTE RESULT */}
      {prediction && prediction.route_type === 'connecting' && prediction.connecting_routes && (
        <div className="bus-predictions-container" style={{ marginTop: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px' }}>
              🔄 Connecting DTC Routes: {prediction.from} → {prediction.to}
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ff9500' }}>
              {prediction.message}
            </span>
          </div>

          {prediction.connecting_routes.map((conn, i) => (
            <div key={i} style={{
              border: '1px solid var(--grey-light)', borderRadius: '8px',
              padding: '20px', marginBottom: '16px',
              background: i === 0 ? 'rgba(0,102,204,0.03)' : 'var(--white)',
              boxShadow: i === 0 ? 'var(--shadow-sm)' : 'none',
            }}>
              {i === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#0066CC', marginBottom: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                  ⭐ BEST OPTION — {conn.total_duration_min} min total
                </div>
              )}

              {/* Leg 1 timeline */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: '700',
                    padding: '2px 6px', borderRadius: '3px', background: '#0066CC12', color: '#0066CC',
                  }}>LEG 1</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '13px' }}>
                    Bus #{conn.leg1.route_id}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                    {conn.leg1.stops_between} stops · {conn.leg1.duration_min} min
                  </span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: '6px', background: '#0066CC08',
                  borderLeft: '3px solid #0066CC',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '600' }}>🚌 {conn.leg1.from_stop}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{formatTime(conn.leg1.departure)}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>→</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '600' }}>🚏 {conn.leg1.to_stop}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{formatTime(conn.leg1.arrival)}</div>
                  </div>
                </div>
              </div>

              {/* Transfer badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', margin: '6px 0',
                background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '20px',
                width: 'fit-content', marginLeft: '28px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: '#856404' }}>
                  🔄 Transfer at {conn.leg1.to_stop}
                </span>
                {conn.transfer_wait_min > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#856404' }}>
                    · Wait ~{conn.transfer_wait_min} min
                  </span>
                )}
              </div>

              {/* Leg 2 timeline */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '8px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: '700',
                    padding: '2px 6px', borderRadius: '3px', background: '#34c75912', color: '#34c759',
                  }}>LEG 2</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '13px' }}>
                    Bus #{conn.leg2.route_id}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                    {conn.leg2.stops_between} stops · {conn.leg2.duration_min} min
                  </span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: '6px', background: '#34c75908',
                  borderLeft: '3px solid #34c759',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '600' }}>🚌 {conn.leg2.from_stop}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{formatTime(conn.leg2.departure)}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>→</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: '600' }}>🏁 {conn.leg2.to_stop}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{formatTime(conn.leg2.arrival)}</div>
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
