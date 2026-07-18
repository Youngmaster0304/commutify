import React from 'react';
import { getLineColor, getLineShort, COACH_TIPS, LAST_MILE } from '../constants';

export default function RouteResult({ route, comparison }) {
  if (!route) return null;

  const { segments, totalTime, interchanges, fare } = route;

  return (
    <div className="route-result">
      {/* Route Segments Timeline */}
      <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px', marginBottom: '16px' }}>
        🗺️ Detailed Metro Route
      </h3>
      
      <div className="segments-list">
        {segments.map((seg, i) => (
          <div key={i} className="segment-item">
            <span 
              className="segment-bullet" 
              style={{ background: getLineColor(seg.line) }} 
            />
            
            <div className="segment-header">
              <span className="segment-line-name" style={{ color: getLineColor(seg.line) }}>
                {seg.line}
              </span>
              <span className="segment-stops-mono">
                ({seg.stations.length} stations)
              </span>
            </div>

            <div className="segment-stations">
              <span className="segment-station-pill">{seg.stations[0]}</span>
              {seg.stations.slice(1, -1).map((s, j) => (
                <span key={j} className="segment-dot" title={s} />
              ))}
              <span className="segment-station-pill">{seg.stations[seg.stations.length - 1]}</span>
            </div>

            {/* Coach interchange tip if any */}
            {i < segments.length - 1 && (
              <div>
                <div className="segment-interchange">
                  <span>⇄</span> Transfer at {seg.stations[seg.stations.length - 1]} (~5 min)
                </div>
                {COACH_TIPS[seg.stations[seg.stations.length - 1]] && (
                  <span className="segment-coach-tip-mono">
                    💡 {COACH_TIPS[seg.stations[seg.stations.length - 1]]}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Last Mile Info */}
      {LAST_MILE[segments[0].stations[0]] && (
        <div className="last-mile-box">
          🚶 <strong>From {segments[0].stations[0]} last-mile:</strong>{' '}
          {LAST_MILE[segments[0].stations[0]]}
        </div>
      )}
      {LAST_MILE[segments[segments.length - 1].stations[segments[segments.length - 1].stations.length - 1]] && (
        <div className="last-mile-box">
          🚶 <strong>To {segments[segments.length - 1].stations[segments[segments.length - 1].stations.length - 1]} last-mile:</strong>{' '}
          {LAST_MILE[segments[segments.length - 1].stations[segments[segments.length - 1].stations.length - 1]]}
        </div>
      )}

      {/* Mode Comparison cards */}
      {comparison && <ModeComparison comparison={comparison} />}
    </div>
  );
}

function ModeComparison({ comparison }) {
  const { modes, distanceKm, flagInterchange } = comparison;
  return (
    <div style={{ marginTop: '30px', borderTop: '1px dashed var(--grey-light)', paddingTop: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Compare Transport Modes ({distanceKm} km)</span>
        {flagInterchange && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#ff9500', background: 'rgba(255, 149, 0, 0.1)', padding: '2px 8px', border: '1px solid #ff9500', borderRadius: '2px' }}>
            ⚠️ Road may be faster
          </span>
        )}
      </h3>
      
      <div className="mode-chips" style={{ marginTop: '16px' }}>
        {modes.map((m) => (
          <div
            key={m.name}
            className={`mode-chip ${m.fastest ? 'fastest' : ''} ${!m.available ? 'unavailable' : ''}`}
            style={{
              flex: 1,
              padding: '16px',
              background: m.fastest ? 'var(--yellow-accent)' : 'var(--grey-bg)',
              border: '1px solid var(--border)',
              boxShadow: m.fastest ? 'var(--shadow-sm)' : 'none',
              borderRadius: '4px',
              textAlign: 'center',
              opacity: m.available ? 1 : 0.5
            }}
          >
            <span style={{ display: 'block', fontSize: '24px', marginBottom: '6px' }}>
              {m.name === 'Metro' ? '🚇' : m.name === 'Auto·Cab' ? '🛺' : '🚌'}
            </span>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: '800' }}>
              {m.name}
            </span>
            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '700', marginTop: '4px' }}>
              {m.available ? `${Math.round(m.time)} min` : 'N/A'}
            </span>
            {m.fastest && (
              <span style={{ display: 'inline-block', marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: '800', border: '1px solid var(--border)', padding: '2px 6px', background: 'var(--white)', borderRadius: '2px' }}>
                FASTEST
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
