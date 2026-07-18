const { loadStations } = require('../engine/routing');

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

function estimateRoadTime(distanceKm, mode) {
  if (mode === 'auto_cab') {
    return (distanceKm / 18) * 60 + 5;
  }
  if (mode === 'bus') {
    return (distanceKm / 15) * 60 + 8;
  }
  return Infinity;
}

function compareModes(routeResult, fromStation, toStation) {
  const stations = loadStations();
  const stationMap = new Map(stations.map((s) => [s.name, s]));

  const from = stationMap.get(fromStation);
  const to = stationMap.get(toStation);
  if (!from || !to) return null;

  const distKm = haversineKm(from.lat, from.lon, to.lat, to.lon);

  const metroTime = routeResult ? routeResult.totalTime : Infinity;
  const autoCabTime = estimateRoadTime(distKm, 'auto_cab');
  const busTime = estimateRoadTime(distKm, 'bus');

  const modes = [
    { name: 'Metro', time: metroTime, available: !!routeResult },
    { name: 'Auto·Cab', time: autoCabTime, available: true },
    { name: 'Bus', time: busTime, available: true },
  ];

  const fastest = modes
    .filter((m) => m.available)
    .reduce((a, b) => (a.time < b.time ? a : b));

  const interchanges = routeResult ? routeResult.interchanges : 0;
  const flagInterchange = interchanges >= 2;

  return {
    distanceKm: Math.round(distKm * 10) / 10,
    modes: modes.map((m) => ({
      ...m,
      time: Math.round(m.time * 10) / 10,
      fastest: m.name === fastest.name,
    })),
    fastestMode: fastest.name,
    flagInterchange,
    interchanges,
  };
}

module.exports = { compareModes, haversineKm };
