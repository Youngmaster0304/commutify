const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { findRoute, loadStations } = require('../engine/routing');
const { compareModes } = require('../comparator/comparator');
const { processMessage } = require('../chatbot/chatbot');
const bus = require('../bus/busEngine');
const fare = require('../fare/fareEngine');
const auth = require('../auth/auth');

let search = null;
try { search = require('../search/elastic'); } catch (e) { search = null; }
let esAvailable = false;
if (search) {
  search.getClient().ping().then(() => { esAvailable = true; }).catch(() => { esAvailable = false; });
}

function loadLostFound() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'lostfound.json'), 'utf8'));
}

const app = express();
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.get('/api/stations', (req, res) => {
  try {
    const stations = loadStations();
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stations/:name', (req, res) => {
  try {
    const stations = loadStations();
    const s = stations.find(
      (st) => st.name.toLowerCase() === req.params.name.toLowerCase()
    );
    if (!s) return res.status(404).json({ error: 'Station not found' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/route', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

    const route = findRoute(from, to);
    if (!route) return res.status(404).json({ error: 'No route found' });

    const comparison = compareModes(route, from, to);

    res.json({ route, comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compare', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

    const route = findRoute(from, to);
    const comparison = compareModes(route, from, to);
    if (!comparison) return res.status(404).json({ error: 'Stations not found' });

    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    if (search && esAvailable) {
      const results = await search.autocomplete(q);
      return res.json(results);
    }
    const stations = loadStations();
    const lower = q.toLowerCase();
    const matches = stations
      .filter(s => s.name.toLowerCase().includes(lower))
      .slice(0, 10)
      .map(s => ({ name: s.name, lines: s.lines, interchange: s.interchange }));
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search/lost-items', async (req, res) => {
  try {
    const { q, station } = req.query;
    if (search && esAvailable) {
      const results = await search.searchLostItems(q || null, station || null);
      return res.json(results);
    }
    let records = loadLostFound();
    if (station) {
      const sLower = station.toLowerCase();
      records = records.filter(r => r.station_matched && r.station_matched.toLowerCase().includes(sLower));
    }
    if (q) {
      const qLower = q.toLowerCase();
      records = records.filter(r =>
        (r.item_name && String(r.item_name).toLowerCase().includes(qLower)) ||
        (r.description && String(r.description).toLowerCase().includes(qLower))
      );
    }
    res.json(records.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search/nearby', async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
    if (search && esAvailable) {
      const results = await search.nearbyLostItems(parseFloat(lat), parseFloat(lon), parseFloat(radius) || 5);
      return res.json(results);
    }
    const stations = loadStations();
    const records = loadLostFound();
    const targetLat = parseFloat(lat);
    const targetLon = parseFloat(lon);
    const radiusKm = parseFloat(radius) || 5;
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };
    const stationMap = new Map(stations.map(s => [s.name, s]));
    const nearby = records
      .filter(r => r.station_matched && stationMap.has(r.station_matched))
      .filter(r => {
        const s = stationMap.get(r.station_matched);
        return haversine(targetLat, targetLon, s.lat, s.lon) <= radiusKm;
      });
    res.json(nearby.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search/hotspots', (req, res) => {
  try {
    if (search && esAvailable) {
      search.lostItemHotspots().then(results => res.json(results)).catch(() => {
        return res.json(computeHotspots());
      });
    } else {
      res.json(computeHotspots());
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function computeHotspots() {
  const records = loadLostFound();
  const counts = {};
  for (const r of records) {
    if (r.station_matched) {
      counts[r.station_matched] = (counts[r.station_matched] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([station, count]) => ({ station, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

app.post('/api/lost-items', async (req, res) => {
  try {
    const { item_name, description, quantity, station, type } = req.body;
    const record = { item_name, description, quantity: quantity || 1, station, type };
    res.json({ message: 'Report received', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/stats', (req, res) => {
  try {
    res.json(bus.getRouteStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = bus.findStopsByName(q);
    res.json(results.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/nearby', (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
    const results = bus.findNearbyStops(parseFloat(lat), parseFloat(lon), parseFloat(radius) || 2);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/routes', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

    const fromStops = bus.findStopsByName(from);
    const toStops = bus.findStopsByName(to);
    if (fromStops.length === 0 || toStops.length === 0) {
      return res.status(404).json({ error: 'Stops not found' });
    }

    const routes = bus.findBusRoutes(fromStops[0], toStops[0]);
    res.json({ routes: routes.slice(0, 10), total: routes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/predict', (req, res) => {
  try {
    const { from, to, departure } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

    const fromStops = bus.findStopsByName(from);
    const toStops = bus.findStopsByName(to);
    if (fromStops.length === 0 || toStops.length === 0) {
      return res.status(404).json({ error: 'Stops not found' });
    }

    const depTime = departure || new Date().toTimeString().slice(0, 8);
    const predictions = bus.predictArrival(fromStops[0], toStops[0], depTime);

    if (predictions && predictions.length > 0) {
      const best = predictions[0];
      return res.json({
        from: fromStops[0].stop_name,
        to: toStops[0].stop_name,
        departure: depTime,
        route_type: 'direct',
        best_prediction: {
          route_id: best.route_id,
          departure: best.departure,
          arrival: best.arrival,
          duration_min: best.duration_min,
          wait_min: best.wait_min,
          total_journey_min: best.total_journey_min,
          stops_between: best.stops_between,
          confidence: best.confidence,
          stops: best.stops,
        },
        alternatives: predictions.slice(1, 5).map((p) => ({
          route_id: p.route_id,
          departure: p.departure,
          arrival: p.arrival,
          duration_min: p.duration_min,
          wait_min: p.wait_min,
          total_journey_min: p.total_journey_min,
          stops_between: p.stops_between,
          confidence: p.confidence,
        })),
        total_options: predictions.length,
      });
    }

    // No direct routes — try 1-transfer connecting routes
    const connecting = bus.findConnectingRoutes(fromStops[0], toStops[0], 5);
    if (connecting && connecting.length > 0) {
      return res.json({
        from: fromStops[0].stop_name,
        to: toStops[0].stop_name,
        departure: depTime,
        route_type: 'connecting',
        connecting_routes: connecting,
        message: `No direct bus found. Showing ${connecting.length} connecting route(s) with 1 transfer.`,
      });
    }

    return res.json({ predictions: [], message: 'No bus routes found between these stops' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fare/predict', (req, res) => {
  try {
    const { from, to, date, time, smart_card, mjqrt, airport_express } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

    const result = fare.predictFare(from, to, {
      date: date || null,
      time: time || null,
      smartCard: smart_card === 'true',
      mjqrt: mjqrt === 'true',
      isAirportExpress: airport_express === 'true',
    });

    if (!result) return res.status(404).json({ error: 'Stations not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fare/chart', (req, res) => {
  try {
    res.json(fare.getFareChart());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fare/from/:station', (req, res) => {
  try {
    const { date, time, smart_card, mjqrt } = req.query;
    const result = fare.getAllStationFares(req.params.station, {
      date: date || null,
      time: time || null,
      smartCard: smart_card === 'true',
      mjqrt: mjqrt === 'true',
    });
    if (!result) return res.status(404).json({ error: 'Station not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const result = auth.signup(name, email, password);
    if (result.error) return res.status(409).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const result = auth.login(email, password);
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const user = auth.validateToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) auth.logout(token);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/crowd/predict', (req, res) => {
  try {
    const { station, time, day } = req.query;
    if (!station) return res.status(400).json({ error: 'station param required' });

    const stations = loadStations();
    const s = stations.find((st) => st.name.toLowerCase() === station.toLowerCase());
    if (!s) return res.status(404).json({ error: 'Station not found in database' });

    const timeStr = time || new Date().toTimeString().slice(0, 5);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const floatTime = hours + minutes / 60;
    const dayStr = day || 'weekday';

    let baseCrowd = 20;
    if (s.interchange) baseCrowd += 25;
    baseCrowd += (s.lines.length - 1) * 10;

    let timeMultiplier = 0.5;
    if (floatTime >= 8.0 && floatTime <= 11.5) {
      timeMultiplier = 2.0;
    } else if (floatTime >= 17.0 && floatTime <= 20.5) {
      timeMultiplier = 2.2;
    } else if ((floatTime >= 11.5 && floatTime <= 13.0) || 
               (floatTime >= 15.5 && floatTime <= 17.0) || 
               (floatTime >= 20.5 && floatTime <= 22.0)) {
      timeMultiplier = 1.2;
    }

    let dayMultiplier = 1.0;
    if (dayStr === 'saturday') dayMultiplier = 0.75;
    if (dayStr === 'sunday') dayMultiplier = 0.45;

    let crowdIndex = Math.min(100, Math.round(baseCrowd * timeMultiplier * dayMultiplier));
    
    let status = 'Low';
    let color = '#34c759';
    let advice = 'Comfortable travel. Plenty of seating available.';

    if (crowdIndex > 75) {
      status = 'Severe Peak';
      color = '#ff3333';
      advice = 'Extremely crowded. Expect long boarding queues. Avoid boarding coach 1 or 2.';
    } else if (crowdIndex > 50) {
      status = 'Moderate Crowd';
      color = '#ffcc00';
      advice = 'Standing room only. Board middle coaches (3-4) for less congestion.';
    } else if (crowdIndex > 30) {
      status = 'Low-Moderate';
      color = '#3399ff';
      advice = 'Seating may be limited, but boarding is quick and easy.';
    }

    const boardingCoach = s.interchange 
      ? 'Board middle coaches 3-5 for faster transfers' 
      : 'Board end coaches 1 or 6 for lighter passenger load';

    res.json({
      station: s.name,
      lines: s.lines,
      time: timeStr,
      day: dayStr,
      crowd_index: crowdIndex,
      status,
      color,
      advice,
      boarding_coach: boardingCoach,
      is_interchange: s.interchange
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const reply = await processMessage(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Interchange API running on port ${PORT}`);
});

module.exports = app;
