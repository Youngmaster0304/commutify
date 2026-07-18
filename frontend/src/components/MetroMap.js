import React, { useState, useEffect } from 'react';
import { fetchStations } from '../api';

const LINE_CONFIG = {
  'Yellow line':       { color: '#FFD700', textColor: '#000', gmapQuery: 'Delhi+Metro+Yellow+Line', endA: 'Samaypur Badli', endB: 'Huda City Centre' },
  'Blue line':         { color: '#0066CC', textColor: '#fff', gmapQuery: 'Delhi+Metro+Blue+Line', endA: 'Dwarka Sector 21', endB: 'Noida Electronic City / Vaishali' },
  'Blue line branch':  { color: '#3399FF', textColor: '#fff', gmapQuery: 'Delhi+Metro+Blue+Line+Branch', endA: 'Yamuna Bank', endB: 'Anand Vihar' },
  'Red line':          { color: '#FF3333', textColor: '#fff', gmapQuery: 'Delhi+Metro+Red+Line', endA: 'Rithala', endB: 'New Bus Adda Ghaziabad' },
  'Green line':        { color: '#33AA33', textColor: '#fff', gmapQuery: 'Delhi+Metro+Green+Line', endA: 'Brigadier Hoshiyar Singh', endB: 'Inderlok' },
  'Green line branch': { color: '#66CC66', textColor: '#000', gmapQuery: 'Delhi+Metro+Green+Line', endA: 'Ashok Park Main', endB: 'South Campus' },
  'Violet line':       { color: '#9933CC', textColor: '#fff', gmapQuery: 'Delhi+Metro+Violet+Line', endA: 'Kashmere Gate', endB: 'Raja Nahar Singh (Ballabhgarh)' },
  'Voilet line':       { color: '#9933CC', textColor: '#fff', gmapQuery: 'Delhi+Metro+Violet+Line', endA: 'Kashmere Gate', endB: 'Raja Nahar Singh (Ballabhgarh)' },
  'Pink line':         { color: '#FF66B2', textColor: '#fff', gmapQuery: 'Delhi+Metro+Pink+Line', endA: 'Majlis Park', endB: 'Shiv Vihar' },
  'Magenta line':      { color: '#FF00FF', textColor: '#fff', gmapQuery: 'Delhi+Metro+Magenta+Line', endA: 'Janakpuri West', endB: 'Botanical Garden' },
  'Gray line':         { color: '#888888', textColor: '#fff', gmapQuery: 'Delhi+Metro+Gray+Line', endA: 'Dwarka', endB: 'Dhansa Bus Stand' },
  'Orange line':       { color: '#FF9933', textColor: '#000', gmapQuery: 'Delhi+Metro+Airport+Express', endA: 'New Delhi', endB: 'Dwarka Sector 21' },
  'Aqua line':         { color: '#00CCCC', textColor: '#000', gmapQuery: 'Delhi+Metro+Aqua+Line+Noida', endA: 'Noida Sector 51', endB: 'Depot Greater Noida' },
  'Rapid Metro':       { color: '#FF6600', textColor: '#fff', gmapQuery: 'Rapid+Metro+Gurgaon', endA: 'Sikandarpur', endB: 'Sector 55-56' },
};

function getLineKey(lineName) {
  return lineName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getConfig(lineName) {
  const key = getLineKey(lineName);
  // Try exact, then includes
  for (const [k, v] of Object.entries(LINE_CONFIG)) {
    if (k.toLowerCase() === key) return { ...v, name: lineName };
  }
  return { color: '#666', textColor: '#fff', gmapQuery: 'Delhi+Metro', endA: '—', endB: '—', name: lineName };
}

export default function MetroMap({ initialLine }) {
  const [stations, setStations] = useState([]);
  const [selectedLine, setSelectedLine] = useState(initialLine || null);
  const [lineStations, setLineStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStations().then(data => {
      setStations(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Auto-select line when initialLine prop changes
  useEffect(() => {
    if (initialLine && stations.length > 0) {
      const match = lines.find(l => l.toLowerCase() === initialLine.toLowerCase());
      if (match && match !== selectedLine) {
        setSelectedLine(match);
        const stationsOnLine = stations
          .filter(s => s.lines.includes(match))
          .sort((a, b) => b.lat - a.lat);
        setLineStations(stationsOnLine);
      }
    }
  }, [initialLine]);

  // Build unique line list from stations
  const lines = React.useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const s of stations) {
      for (const l of s.lines) {
        if (!seen.has(l)) {
          seen.add(l);
          result.push(l);
        }
      }
    }
    return result.sort((a, b) => {
      const order = ['Yellow line', 'Blue line', 'Red line', 'Green line', 'Violet line', 'Voilet line', 'Pink line', 'Magenta line', 'Orange line', 'Gray line', 'Aqua line', 'Blue line branch', 'Green line branch', 'Rapid Metro'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [stations]);

  const handleLineClick = (line) => {
    if (selectedLine === line) { setSelectedLine(null); setLineStations([]); return; }
    setSelectedLine(line);
    const stationsOnLine = stations
      .filter(s => s.lines.includes(line))
      .sort((a, b) => b.lat - a.lat);
    setLineStations(stationsOnLine);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading metro network data…</div>;

  const cfg = selectedLine ? getConfig(selectedLine) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedLine ? '280px 1fr' : '1fr', gap: 0, minHeight: '500px' }}>
      {/* Line selector panel */}
      <div style={{ borderRight: selectedLine ? '1px solid var(--grey-light)' : 'none', overflowY: 'auto', maxHeight: '600px' }}>
        <div style={{ padding: '16px 20px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
          SELECT LINE — {lines.length} ACTIVE
        </div>
        {lines.map(line => {
          const c = getConfig(line);
          const active = selectedLine === line;
          return (
            <div
              key={line}
              onClick={() => handleLineClick(line)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', cursor: 'pointer',
                background: active ? `${c.color}15` : 'transparent',
                borderLeft: active ? `3px solid ${c.color}` : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '13px', color: 'var(--text)' }}>{line}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {c.endA} ↔ {c.endB}
                </div>
              </div>
              {active && <span style={{ color: c.color, fontSize: '12px' }}>▶</span>}
            </div>
          );
        })}
      </div>

      {/* Station list + map link panel */}
      {selectedLine && cfg && (
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '600px' }}>
          {/* Line header */}
          <div style={{
            padding: '20px 24px', background: `${cfg.color}18`,
            borderBottom: `2px solid ${cfg.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: cfg.color }} />
                <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: '800', fontSize: '18px', color: 'var(--text)' }}>
                  {selectedLine}
                </h3>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                {lineStations.length} stations · {cfg.endA} ↔ {cfg.endB}
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/${cfg.gmapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '4px',
                background: cfg.color, color: cfg.textColor,
                fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '12px',
                textDecoration: 'none', whiteSpace: 'nowrap',
                boxShadow: `0 2px 8px ${cfg.color}55`
              }}
            >
              🗺️ View on Google Maps
            </a>
          </div>

          {/* Station list */}
          <div style={{ padding: '16px 24px', flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lineStations.map((s, i) => (
                <a
                  key={s.name}
                  href={`https://www.google.com/maps/search/${encodeURIComponent(s.name + ' metro station Delhi')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '20px',
                    border: `1px solid ${s.interchange ? cfg.color : 'var(--grey-light)'}`,
                    background: s.interchange ? `${cfg.color}18` : 'var(--white)',
                    fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: s.interchange ? '700' : '500',
                    color: 'var(--text)', textDecoration: 'none', cursor: 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap'
                  }}
                  title={`${s.name} — ${s.layout} · Opened: ${s.opened}${s.interchange ? ' · INTERCHANGE' : ''}`}
                >
                  {s.interchange && <span style={{ color: cfg.color, fontSize: '10px' }}>⇄</span>}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginRight: '2px' }}>{i + 1}</span>
                  {s.name}
                </a>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--grey-bg)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
              ⇄ = Interchange station &nbsp;·&nbsp; Click any station to open in Google Maps &nbsp;·&nbsp; {lineStations.filter(s => s.interchange).length} interchange(s) on this line
            </div>
          </div>
        </div>
      )}

      {/* Default state — no line selected */}
      {!selectedLine && (
        <div style={{ gridColumn: '1', display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '24px' }}>
          {lines.map(line => {
            const c = getConfig(line);
            const count = stations.filter(s => s.lines.includes(line)).length;
            return (
              <div
                key={line}
                onClick={() => handleLineClick(line)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px 20px', borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid var(--grey-light)', background: 'var(--white)',
                  minWidth: '240px', flex: '1 1 240px',
                  transition: 'all 0.15s ease', boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ width: '4px', height: '42px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>{line}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
                    {count} stations · Click to explore
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
