// Automatically redirect to backend port 3001 if using React dev server on 3000
export const API_BASE = typeof window !== 'undefined' && window.location.port === '3000'
  ? 'http://localhost:3001'
  : '';

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/api/stations`);
  return res.json();
}

export async function searchAutocomplete(query) {
  const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function fetchRoute(from, to) {
  const res = await fetch(`${API_BASE}/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error('Route not found');
  return res.json();
}

export async function fetchComparison(from, to) {
  const res = await fetch(`${API_BASE}/api/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error('Comparison not available');
  return res.json();
}

export async function searchLostItems(query, station) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (station) params.set('station', station);
  const res = await fetch(`${API_BASE}/api/search/lost-items?${params}`);
  return res.json();
}

export async function fetchHotspots() {
  const res = await fetch(`${API_BASE}/api/search/hotspots`);
  return res.json();
}

export async function reportLostItem(item) {
  const res = await fetch(`${API_BASE}/api/lost-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function predictBus(from, to, departure) {
  const res = await fetch(`${API_BASE}/api/bus/predict?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&departure=${departure}`);
  return res.json();
}

export async function fetchBusStats() {
  const res = await fetch(`${API_BASE}/api/bus/stats`);
  return res.json();
}

export async function predictFare(from, to, options = {}) {
  const params = new URLSearchParams({
    from,
    to,
    smart_card: options.smartCard ? 'true' : 'false',
    mjqrt: options.mjqrt ? 'true' : 'false'
  });
  const res = await fetch(`${API_BASE}/api/fare/predict?${params}`);
  return res.json();
}

export async function fetchFareChart() {
  const res = await fetch(`${API_BASE}/api/fare/chart`);
  return res.json();
}

export async function sendChatMessage(message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  return res.json();
}
