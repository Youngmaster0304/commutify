import React, { useState, useRef, useEffect } from 'react';
import { fetchStations } from '../api';

export default function StationPicker({ label, value, onSelect, placeholder }) {
  const [query, setQuery] = useState('');
  const [allStations, setAllStations] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchStations().then(setAllStations).catch(() => {});
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query.trim()
    ? allStations
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.lines.some((l) => l.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 12)
    : allStations.slice(0, 12); // Show first 12 stations by default when query is empty!

  return (
    <div className="sp-wrapper" ref={ref}>
      {label && <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>{label}</label>}
      <div className="sp-input-container">
        <input
          type="text"
          value={value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Search station...'}
          className="sp-input"
        />
        {value && (
          <button className="sp-clear" onClick={() => { setQuery(''); onSelect(null); }}>
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="sp-suggestions">
          {filtered.map((s) => (
            <li
              key={s.name}
              className="sp-suggestion-item"
              onClick={() => {
                setQuery(s.name);
                onSelect(s.name);
                setOpen(false);
              }}
            >
              <span className="sp-suggestion-name">{s.name}</span>
              <span className="sp-suggestion-lines">
                {s.lines.map((l) => (
                  <span key={l} className="sp-badge" style={{ background: getLineColor(l) }}>
                    {getLineShort(l)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
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

function getLineShort(line) {
  const short = {
    'Yellow line': 'YL', 'Blue line': 'BL', 'Blue line branch': 'BLB', 'Red line': 'RL',
    'Green line': 'GL', 'Green line branch': 'GLB', 'Violet line': 'VL', 'Voilet line': 'VL',
    'Orange line': 'OL', 'Pink line': 'PL', 'Magenta line': 'ML', 'Gray line': 'GR',
    'Aqua line': 'AL', 'Rapid Metro': 'RM',
  };
  return short[line] || line.slice(0, 2).toUpperCase();
}
