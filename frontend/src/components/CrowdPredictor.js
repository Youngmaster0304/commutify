import React, { useState, useEffect } from 'react';
import StationPicker from './StationPicker';

export default function CrowdPredictor() {
  const [station, setStation] = useState('');
  const [time, setTime] = useState('');
  const [day, setDay] = useState('weekday');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  const handlePredict = async () => {
    if (!station) {
      setError('Please select a station.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crowd/predict?station=${encodeURIComponent(station)}&time=${time}&day=${day}`);
      if (!res.ok) {
        throw new Error('Failed to fetch prediction');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Could not calculate crowd prediction for this station.');
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="features-content-wrapper" style={{ padding: '30px', background: 'var(--white)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
        
        {/* Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid var(--grey-light)', paddingRight: '30px' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '18px' }}>
            Predict Station Crowd
          </h3>
          
          <div className="planner-input-group">
            <label>Station Name</label>
            <StationPicker
              label={null}
              value={station}
              onSelect={setStation}
              placeholder="Select target station..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="planner-input-group">
              <label>Time of Day</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="sp-input"
                style={{ height: '45px' }}
              />
            </div>
            
            <div className="planner-input-group">
              <label>Day of Week</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="sp-input"
                style={{ height: '45px', padding: '10px' }}
              >
                <option value="weekday">Weekday (Mon-Fri)</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday / Holiday</option>
              </select>
            </div>
          </div>

          {error && <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>}

          <button
            onClick={handlePredict}
            className="btn-console-find"
            disabled={loading || !station}
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          >
            {loading ? 'Calculating...' : 'Predict Crowd ⚡'}
          </button>
        </div>

        {/* Prediction Results Display */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Circular Crowd Gauge Indicator */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: `8px solid ${result.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '800',
                  fontSize: '20px',
                  background: 'var(--bg)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {result.crowd_index}%
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="console-header-badge" style={{ color: 'var(--text-dim)', marginBottom: 0 }}>
                    CONGESTION RATE
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '26px', color: result.color }}>
                    {result.status}
                  </h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                    {result.time} ({result.day.toUpperCase()})
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--grey-bg)', border: '1px solid var(--grey-light)', borderRadius: '4px', padding: '16px' }}>
                <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  Commuter Travel Advice
                </h4>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                  {result.advice}
                </p>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '16px', background: 'var(--white)' }}>
                <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  🏃 Boarding recommendation
                </h4>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text)', fontWeight: '600' }}>
                  {result.boarding_coach}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>Active Lines:</span>
                {result.lines.map((l) => (
                  <span key={l} className="sp-badge" style={{
                    background: getLineColor(l),
                    color: '#000',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '2px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {l}
                  </span>
                ))}
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', border: '1px dashed var(--grey-light)', borderRadius: '4px' }}>
              📊 Select a Delhi Metro station on the left to predict the live crowding level, queue delays, and boarding suggestions.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function getLineColor(line) {
  const colors = {
    'Yellow line': '#FFD700', 'Blue line': '#0066CC', 'Blue line branch': '#3399FF',
    'Red line': '#FF3333', 'Green line': '#33AA33', 'Green line branch': '#66CC66',
    'Violet line': '#9933CC', 'Voilet line': '#9933CC', 'Orange line': '#FF9933',
    'Pink line': '#FF66B2', 'Magenta line': '#FF00FF', 'Gray line': '#999999',
    'Aqua line': '#00CCCC', 'Rapid Metro': '#FF6600',
  };
  return colors[line] || '#666';
}
