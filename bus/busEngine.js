const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'delhi_bus_routes.csv');

let busData = null;

function loadBusData() {
  if (busData) return busData;

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 8) continue;
    rows.push({
      route_id: cols[0],
      trip_id: cols[1],
      arrival_time: cols[2],
      departure_time: cols[3],
      stop_id: cols[4],
      stop_name: cols[5],
      stop_lat: parseFloat(cols[6]),
      stop_lon: parseFloat(cols[7]),
    });
  }

  const routes = new Map();
  const stopsByName = new Map();
  const stopsById = new Map();

  for (const row of rows) {
    if (!routes.has(row.route_id)) {
      routes.set(row.route_id, {
        route_id: row.route_id,
        trips: new Map(),
        stops: [],
      });
    }
    const route = routes.get(row.route_id);
    if (!route.trips.has(row.trip_id)) {
      route.trips.set(row.trip_id, []);
    }
    route.trips.get(row.trip_id).push({
      stop_id: row.stop_id,
      stop_name: row.stop_name,
      stop_lat: row.stop_lat,
      stop_lon: row.stop_lon,
      arrival: row.arrival_time,
      departure: row.departure_time,
    });

    const stopKey = row.stop_name.toLowerCase().trim();
    if (!stopsByName.has(stopKey)) {
      stopsByName.set(stopKey, {
        stop_id: row.stop_id,
        stop_name: row.stop_name,
        stop_lat: row.stop_lat,
        stop_lon: row.stop_lon,
        routes: new Set(),
      });
    }
    stopsByName.get(stopKey).routes.add(row.route_id);
    stopsById.set(row.stop_id, stopsByName.get(stopKey));
  }

  for (const route of routes.values()) {
    const firstTrip = route.trips.values().next().value;
    if (firstTrip) {
      route.stops = firstTrip;
      route.stop_count = firstTrip.length;
      route.first_stop = firstTrip[0].stop_name;
      route.last_stop = firstTrip[firstTrip.length - 1].stop_name;
    }
    route.trip_count = route.trips.size;
  }

  busData = {
    routes: Object.fromEntries(routes),
    stopsByName: Object.fromEntries(
      [...stopsByName.entries()].map(([k, v]) => [k, { ...v, routes: [...v.routes] }])
    ),
    stopsById: Object.fromEntries(
      [...stopsById.entries()].map(([k, v]) => [k, { ...v, routes: [...v.routes] }])
    ),
    totalRoutes: routes.size,
    totalStops: stopsByName.size,
    totalTrips: new Set(rows.map((r) => r.trip_id)).size,
  };

  return busData;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findStopsByName(query) {
  const data = loadBusData();
  const q = query.toLowerCase().trim();
  const results = [];
  for (const [key, stop] of Object.entries(data.stopsByName)) {
    if (key.includes(q)) {
      results.push(stop);
    }
  }
  return results.sort((a, b) => {
    const aStart = a.stop_name.toLowerCase().startsWith(q);
    const bStart = b.stop_name.toLowerCase().startsWith(q);
    if (aStart && !bStart) return -1;
    if (!aStart && bStart) return 1;
    return a.stop_name.length - b.stop_name.length;
  });
}

function findNearbyStops(lat, lon, radiusKm = 2) {
  const data = loadBusData();
  const results = [];
  for (const stop of Object.values(data.stopsByName)) {
    const dist = haversineKm(lat, lon, stop.stop_lat, stop.stop_lon);
    if (dist <= radiusKm) {
      results.push({ ...stop, distance_km: Math.round(dist * 100) / 100 });
    }
  }
  return results.sort((a, b) => a.distance_km - b.distance_km);
}

function parseTime(t) {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
}

// Resolve a stop object to its actual data key in stopsByName (fuzzy)
function resolveStopData(stop, data) {
  const exactKey = stop.stop_name.toLowerCase().trim();
  if (data.stopsByName[exactKey]) return { key: exactKey, data: data.stopsByName[exactKey] };
  // Fuzzy: check if any stored key contains the search key or vice-versa
  for (const [key, val] of Object.entries(data.stopsByName)) {
    if (key.includes(exactKey) || exactKey.includes(key)) return { key, data: val };
  }
  return null;
}

// Match a stop name inside a trip's stop list (fuzzy)
function matchStopInTrip(tripStops, stopKey) {
  for (let i = 0; i < tripStops.length; i++) {
    const tn = tripStops[i].stop_name.toLowerCase().trim();
    if (tn === stopKey || tn.includes(stopKey) || stopKey.includes(tn)) return i;
  }
  return -1;
}

function findBusRoutes(fromStop, toStop) {
  const data = loadBusData();

  const fromResolved = resolveStopData(fromStop, data);
  const toResolved = resolveStopData(toStop, data);
  if (!fromResolved || !toResolved) return [];

  const fromKey = fromResolved.key;
  const toKey = toResolved.key;
  const fromRouteSet = new Set(fromResolved.data.routes);
  const toRouteSet = new Set(toResolved.data.routes);

  // Common routes that serve BOTH stops
  const commonRoutes = fromResolved.data.routes.filter(r => toRouteSet.has(r));
  const results = [];
  const seenTrips = new Set();

  for (const routeId of commonRoutes) {
    const route = data.routes[routeId];
    if (!route) continue;

    for (const [tripId, tripStops] of route.trips) {
      if (seenTrips.has(tripId)) continue;
      const fromIdx = matchStopInTrip(tripStops, fromKey);
      const toIdx = matchStopInTrip(tripStops, toKey);

      if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
        seenTrips.add(tripId);
        const departTime = tripStops[fromIdx].departure;
        const arriveTime = tripStops[toIdx].arrival;
        const durationMin = Math.max(1, parseTime(arriveTime) - parseTime(departTime));
        results.push({
          type: 'direct',
          route_id: routeId,
          trip_id: tripId,
          from_stop: tripStops[fromIdx].stop_name,
          to_stop: tripStops[toIdx].stop_name,
          departure: departTime,
          arrival: arriveTime,
          duration_min: Math.round(durationMin * 10) / 10,
          stops_between: toIdx - fromIdx,
          from_lat: tripStops[fromIdx].stop_lat,
          from_lon: tripStops[fromIdx].stop_lon,
          to_lat: tripStops[toIdx].stop_lat,
          to_lon: tripStops[toIdx].stop_lon,
          stops: tripStops.slice(fromIdx, toIdx + 1).map(s => ({
            name: s.stop_name, lat: s.stop_lat, lon: s.stop_lon, time: s.arrival,
          })),
        });
      }
    }
  }

  results.sort((a, b) => a.duration_min - b.duration_min);
  return results;
}

// Find routes with 1 transfer — Bus A from FROM to transfer stop, Bus B from transfer stop to TO
function findConnectingRoutes(fromStop, toStop, maxResults = 5) {
  const data = loadBusData();

  const fromResolved = resolveStopData(fromStop, data);
  const toResolved = resolveStopData(toStop, data);
  if (!fromResolved || !toResolved) return [];

  const fromKey = fromResolved.key;
  const toKey = toResolved.key;
  const fromRoutes = fromResolved.data.routes; // routes that serve FROM
  const toRoutes = toResolved.data.routes;     // routes that serve TO

  // Build: for each route from FROM, collect all stops reachable AFTER the from stop
  // For each route to TO, collect all stops reachable BEFORE the to stop
  // Find intersection → transfer candidates

  // Collect forward reachable stops from FROM
  const fromReachable = new Map(); // stopKey -> [{route_id, departure_from, arrival_transfer, duration_leg1}]
  for (const routeId of fromRoutes) {
    const route = data.routes[routeId];
    if (!route) continue;
    for (const [, tripStops] of route.trips) {
      const fromIdx = matchStopInTrip(tripStops, fromKey);
      if (fromIdx === -1) continue;
      // All stops after fromIdx are potential transfer points
      for (let i = fromIdx + 1; i < tripStops.length; i++) {
        const sk = tripStops[i].stop_name.toLowerCase().trim();
        if (!fromReachable.has(sk)) fromReachable.set(sk, []);
        fromReachable.get(sk).push({
          route_id: routeId,
          from_stop: tripStops[fromIdx].stop_name,
          transfer_stop: tripStops[i].stop_name,
          transfer_lat: tripStops[i].stop_lat,
          transfer_lon: tripStops[i].stop_lon,
          departure_leg1: tripStops[fromIdx].departure,
          arrival_transfer: tripStops[i].arrival,
          duration_leg1: Math.max(1, parseTime(tripStops[i].arrival) - parseTime(tripStops[fromIdx].departure)),
          stops_leg1: i - fromIdx,
        });
      }
      break; // Use first trip per route to keep it fast
    }
  }

  // For each toRoute, find stops before the TO stop → check if they're in fromReachable
  const results = [];
  const seenPairs = new Set();

  for (const routeId of toRoutes) {
    const route = data.routes[routeId];
    if (!route) continue;
    for (const [, tripStops] of route.trips) {
      const toIdx = matchStopInTrip(tripStops, toKey);
      if (toIdx === -1) continue;
      // Check each stop BEFORE toIdx as potential transfer
      for (let j = 0; j < toIdx; j++) {
        const sk = tripStops[j].stop_name.toLowerCase().trim();
        if (!fromReachable.has(sk)) continue;
        const leg1Options = fromReachable.get(sk);
        for (const leg1 of leg1Options) {
          const pairKey = `${leg1.route_id}-${routeId}-${sk}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          const durationLeg2 = Math.max(1, parseTime(tripStops[toIdx].arrival) - parseTime(tripStops[j].departure));
          const transferWait = Math.max(0, parseTime(tripStops[j].departure) - parseTime(leg1.arrival_transfer));
          const totalDuration = leg1.duration_leg1 + transferWait + durationLeg2;

          results.push({
            type: 'connecting',
            total_duration_min: Math.round(totalDuration * 10) / 10,
            transfer_wait_min: Math.round(transferWait * 10) / 10,
            leg1: {
              route_id: leg1.route_id,
              from_stop: leg1.from_stop,
              to_stop: leg1.transfer_stop,
              transfer_lat: leg1.transfer_lat,
              transfer_lon: leg1.transfer_lon,
              departure: leg1.departure_leg1,
              arrival: leg1.arrival_transfer,
              duration_min: Math.round(leg1.duration_leg1 * 10) / 10,
              stops_between: leg1.stops_leg1,
            },
            leg2: {
              route_id: routeId,
              from_stop: tripStops[j].stop_name,
              to_stop: tripStops[toIdx].stop_name,
              departure: tripStops[j].departure,
              arrival: tripStops[toIdx].arrival,
              duration_min: Math.round(durationLeg2 * 10) / 10,
              stops_between: toIdx - j,
            },
          });

          if (results.length >= 200) break; // Cap intermediate search
        }
        if (results.length >= 200) break;
      }
      break; // Use first trip per route
    }
  }

  results.sort((a, b) => a.total_duration_min - b.total_duration_min);
  // De-duplicate by leg1+leg2 route combo, keep best
  const deduped = [];
  const seen2 = new Set();
  for (const r of results) {
    const key = `${r.leg1.route_id}-${r.leg2.route_id}`;
    if (!seen2.has(key)) {
      seen2.add(key);
      deduped.push(r);
    }
  }
  return deduped.slice(0, maxResults);
}

function predictArrival(fromStop, toStop, departureTime) {
  const routes = findBusRoutes(fromStop, toStop);
  if (routes.length === 0) return [];

  const depMinutes = parseTime(departureTime);

  const withPrediction = routes.map((r) => {
    const routeDepMinutes = parseTime(r.departure);
    const waitMinutes = routeDepMinutes - depMinutes;
    const actualWait = waitMinutes >= 0 ? waitMinutes : 1440 + waitMinutes;
    const totalJourney = actualWait + r.duration_min;

    return {
      ...r,
      wait_min: Math.round(actualWait * 10) / 10,
      total_journey_min: Math.round(totalJourney * 10) / 10,
      confidence: getConfidence(r),
    };
  });

  withPrediction.sort((a, b) => a.total_journey_min - b.total_journey_min);
  return withPrediction;
}

function getConfidence(route) {
  if (route.stops_between <= 3) return 'high';
  if (route.stops_between <= 8) return 'medium';
  return 'low';
}

function getRouteStats() {
  const data = loadBusData();
  const routeList = Object.values(data.routes);
  const avgStops = routeList.reduce((s, r) => s + (r.stop_count || 0), 0) / routeList.length;
  return {
    total_routes: data.totalRoutes,
    total_stops: data.totalStops,
    total_trips: data.totalTrips,
    avg_stops_per_route: Math.round(avgStops),
  };
}

module.exports = {
  loadBusData,
  findStopsByName,
  findNearbyStops,
  findBusRoutes,
  findConnectingRoutes,
  predictArrival,
  getRouteStats,
  haversineKm,
};
