import React, { useState, useEffect } from 'react';
import { fetchStations, API_BASE } from '../api';

function formatFare(f) {
  return f !== undefined && f !== null ? `₹${f}` : '—';
}

export default function FarePredictor() {
  const [stations, setStations] = useState([]);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [smartCard, setSmartCard] = useState(false);
  const [mjqrt, setMjqrt] = useState(false);
  const [result, setResult] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('predict');
  const [chartTab, setChartTab] = useState('weekday'); // 'weekday' | 'sunday' | 'airport'

  useEffect(() => {
    fetchStations().then(setStations).catch(() => {});
    fetch(`${API_BASE}/api/fare/chart`).then((r) => r.json()).then(setChart).catch(() => {});
    const now = new Date();
    setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  const filterStops = (q) => {
    if (q.length < 1) return [];
    return stations
      .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);
  };

  const handlePredict = async () => {
    if (!fromStation || !toStation) { setError('Select both stations'); return; }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        from: fromStation,
        to: toStation,
        smart_card: String(smartCard),
        mjqrt: String(mjqrt),
      });
      if (date) params.set('date', date);
      if (time) params.set('time', time);
      const res = await fetch(`${API_BASE}/api/fare/predict?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setResult(null); }
      else setResult(data);
    } catch {
      setError('Failed to predict fare');
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="fare-planner-card">
      {/* Sub tabs header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-light)', marginBottom: '24px' }}>
        <button 
          className={`nav-link ${activeTab === 'predict' ? 'active' : ''}`}
          onClick={() => setActiveTab('predict')}
          style={{ fontSize: '13px', fontWeight: '800', borderBottom: activeTab === 'predict' ? '2px solid var(--border)' : 'none', borderRadius: 0 }}
        >
          💰 Fare Estimator
        </button>
        <button 
          className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
          style={{ fontSize: '13px', fontWeight: '800', borderBottom: activeTab === 'chart' ? '2px solid var(--border)' : 'none', borderRadius: 0 }}
        >
          📋 Standard Charts
        </button>
      </div>

      {activeTab === 'predict' && (
        <div>
          <div className="fare-form-grid">
            <div className="bus-input-container">
              <label>Origin Station</label>
              <input 
                type="text" 
                className="bus-input-field"
                value={fromQuery} 
                onChange={(e) => {
                  setFromQuery(e.target.value); 
                  setFromStation(''); 
                  setFromSuggestions(filterStops(e.target.value));
                }} 
                placeholder="Where are you starting?" 
              />
              {fromSuggestions.length > 0 && !fromStation && (
                <ul className="bus-suggestions-list">
                  {fromSuggestions.map((s, i) => (
                    <li 
                      key={i} 
                      className="bus-suggestion-item"
                      onClick={() => { 
                        setFromStation(s.name); 
                        setFromQuery(s.name); 
                        setFromSuggestions([]); 
                      }}
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bus-input-container">
              <label>Destination Station</label>
              <input 
                type="text" 
                className="bus-input-field"
                value={toQuery} 
                onChange={(e) => {
                  setToQuery(e.target.value); 
                  setToStation(''); 
                  setToSuggestions(filterStops(e.target.value));
                }} 
                placeholder="Where are you going?" 
              />
              {toSuggestions.length > 0 && !toStation && (
                <ul className="bus-suggestions-list">
                  {toSuggestions.map((s, i) => (
                    <li 
                      key={i} 
                      className="bus-suggestion-item"
                      onClick={() => { 
                        setToStation(s.name); 
                        setToQuery(s.name); 
                        setToSuggestions([]); 
                      }}
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="bus-input-container">
              <label>Commute Date</label>
              <input type="date" className="bus-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="bus-input-container">
              <label>Departure Time</label>
              <input type="time" className="bus-input-field" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="fare-toggles-row">
            <label className="fare-toggle-label">
              <input type="checkbox" checked={smartCard} onChange={(e) => setSmartCard(e.target.checked)} />
              💳 Smart Card Discount (10% Off)
            </label>
            
            <label className="fare-toggle-label">
              <input type="checkbox" checked={mjqrt} onChange={(e) => setMjqrt(e.target.checked)} />
              🎫 MJQRT Commuter (Off-Peak 20% Off)
            </label>
          </div>

          <button 
            className="btn-primary" 
            onClick={handlePredict} 
            disabled={loading || !fromStation || !toStation}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Estimating Fares...' : 'Calculate Journey Fare ↗'}
          </button>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#ffebeb', border: '1px solid #ff2d55', color: '#ff2d55', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {result && (
            <div className="fare-result-dashboard">
              <div className="fare-info-strip">
                <span>📏 Straight line: {result.direct_distance_km} km</span>
                <span>🛤️ Track route: ~{result.estimated_route_km} km</span>
                {result.travel_time_min && <span>⏱️ Est. time: {result.travel_time_min} mins</span>}
                {result.interchanges > 0 && <span>🔄 Changes: {result.interchanges}</span>}
              </div>

              <div className="fare-cards-grid">
                <div className="fare-metric-card">
                  <span className="fare-metric-label-mono">TOKEN FARE</span>
                  <span className="fare-metric-value">{formatFare(result.fare.token_fare)}</span>
                  <span className="fare-metric-subtext-mono">Paper Ticket Price</span>
                </div>

                <div className="fare-metric-card">
                  <span className="fare-metric-label-mono">SMART CARD</span>
                  <span className="fare-metric-value">{formatFare(result.fare.smart_card_fare)}</span>
                  <span className="fare-metric-subtext-mono">10% standard reduction</span>
                </div>

                <div className="fare-metric-card">
                  <span className="fare-metric-label-mono">MJQRT FARE</span>
                  <span className="fare-metric-value">{formatFare(result.fare.mjqrt_offpeak_fare)}</span>
                  <span className="fare-metric-subtext-mono">20% off-peak reduction</span>
                </div>

                <div className="fare-metric-card highlighted">
                  <span className="fare-metric-label-mono">FINAL FARE</span>
                  <span className="fare-metric-value">{formatFare(result.fare.final_fare)}</span>
                  <span className="fare-metric-subtext-mono" style={{ fontWeight: '700' }}>
                    {result.fare.discount_applied || 'Best price selected'}
                  </span>
                </div>
              </div>

              {result.savings && (
                <div className="fare-savings-row">
                  <div className="fare-savings-title">💡 Commuter Savings Analysis</div>
                  <div className="fare-savings-details">
                    • Using Smart Card saves <strong>₹{result.savings.smart_card}</strong> per single trip.<br />
                    • Off-Peak MJQRT coupon saves <strong>₹{result.savings.mjqrt_offpeak}</strong> per single trip.<br />
                    • Projected monthly savings (44 trips): 
                    Smart Card: <strong>₹{result.savings.smart_card * 44}</strong> / 
                    MJQRT: <strong>₹{result.savings.mjqrt_offpeak * 44}</strong>.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'chart' && chart && (
        <div>
          <div className="fare-subtabs-row">
            <button className={`fare-subtab-btn ${chartTab === 'weekday' ? 'active' : ''}`} onClick={() => setChartTab('weekday')}>
              Weekday (Mon–Sat)
            </button>
            <button className={`fare-subtab-btn ${chartTab === 'sunday' ? 'active' : ''}`} onClick={() => setChartTab('sunday')}>
              Sunday & Holidays
            </button>
            <button className={`fare-subtab-btn ${chartTab === 'airport' ? 'active' : ''}`} onClick={() => setChartTab('airport')}>
              Airport Express Line
            </button>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px' }}>
            {chartTab === 'weekday' && (
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>Distance Slab</th>
                    <th>Standard Ticket</th>
                    <th>Smart Card (10% off)</th>
                    <th>Net Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.weekday.map((row, i) => (
                    <tr key={i}>
                      <td>{row.distance}</td>
                      <td>{row.fare}</td>
                      <td className="sc-val">{row.smart_card}</td>
                      <td className="savings-val">{row.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {chartTab === 'sunday' && (
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>Distance Slab</th>
                    <th>Holiday Ticket</th>
                    <th>Smart Card (Reduced)</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.sunday_holiday.map((row, i) => (
                    <tr key={i}>
                      <td>{row.distance}</td>
                      <td>{row.fare}</td>
                      <td className="sc-val">{row.smart_card}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {chartTab === 'airport' && (
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>Slab Description</th>
                    <th>Fare Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.airport_express.map((row, i) => (
                    <tr key={i}>
                      <td>{row.distance}</td>
                      <td style={{ fontWeight: '700' }}>{row.fare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
