const { loadStations, findRoute } = require('../engine/routing');

const FARE_SLABS_WEEKDAY = [
  { maxKm: 2, fare: 11 },
  { maxKm: 5, fare: 21 },
  { maxKm: 12, fare: 32 },
  { maxKm: 21, fare: 43 },
  { maxKm: 32, fare: 54 },
  { maxKm: Infinity, fare: 64 },
];

const FARE_SLABS_HOLIDAY = [
  { maxKm: 2, fare: 11 },
  { maxKm: 5, fare: 11 },
  { maxKm: 12, fare: 21 },
  { maxKm: 21, fare: 32 },
  { maxKm: 32, fare: 43 },
  { maxKm: Infinity, fare: 54 },
];

const AIRPORT_EXPRESS_FARES = [
  { maxKm: 5, fare: 20 },
  { maxKm: 10, fare: 40 },
  { maxKm: 15, fare: 50 },
  { maxKm: 20, fare: 60 },
  { maxKm: Infinity, fare: 75 },
];

const OFF_PEAK_WINDOWS = [
  { start: '05:30', end: '08:00' },
  { start: '12:00', end: '17:00' },
  { start: '21:00', end: '23:30' },
];

const NATIONAL_HOLIDAYS = [
  '01-01', '01-26', '03-14', '03-31', '04-10', '04-14', '04-18',
  '05-01', '05-12', '06-27', '08-15', '08-27', '10-02', '10-20',
  '10-21', '11-01', '11-05', '11-25', '12-25',
];

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

function isHoliday(dateStr) {
  if (!dateStr) {
    const now = new Date();
    dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return NATIONAL_HOLIDAYS.includes(dateStr);
}

function isSunday(dateStr) {
  if (!dateStr) return new Date().getDay() === 0;
  const parts = dateStr.split(/[-/]/);
  const d = new Date(parts[2], parts[1] - 1, parts[0]);
  return d.getDay() === 0;
}

function isOffPeak(timeStr) {
  if (!timeStr) {
    const now = new Date();
    timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const t = timeStr.slice(0, 5);
  return OFF_PEAK_WINDOWS.some((w) => t >= w.start && t < w.end);
}

function getDistanceSlabKm(distanceKm) {
  for (const slab of FARE_SLABS_WEEKDAY) {
    if (distanceKm <= slab.maxKm) return slab.maxKm === Infinity ? '>32' : `≤${slab.maxKm}`;
  }
  return '>32';
}

function getFareSlab(distanceKm, isHolidayFare) {
  const slabs = isHolidayFare ? FARE_SLABS_HOLIDAY : FARE_SLABS_WEEKDAY;
  for (const slab of slabs) {
    if (distanceKm <= slab.maxKm) return slab;
  }
  return slabs[slabs.length - 1];
}

function calculateFare(distanceKm, options = {}) {
  const {
    date = null,
    time = null,
    smartCard = false,
    mjqrt = false,
    isAirportExpress = false,
  } = options;

  const holiday = isHoliday(date) || isSunday(date);
  const offPeak = isOffPeak(time);

  if (isAirportExpress) {
    const slab = AIRPORT_EXPRESS_FARES.find((s) => distanceKm <= s.maxKm) ||
      AIRPORT_EXPRESS_FARES[AIRPORT_EXPRESS_FARES.length - 1];
    let fare = slab.fare;
    let discount = 0;
    if (smartCard) {
      discount = Math.round(fare * 0.10 * 100) / 100;
      fare = Math.round((fare - discount) * 100) / 100;
    }
    return {
      token_fare: slab.fare,
      smart_card_fare: Math.round(slab.fare * 0.90 * 100) / 100,
      final_fare: fare,
      discount_applied: discount > 0 ? `Smart Card 10% off` : null,
      line: 'Airport Express',
    };
  }

  const slab = getFareSlab(distanceKm, holiday);
  let baseFare = slab.fare;
  let discount = 0;
  let discountLabel = null;

  if (smartCard) {
    const scDiscount = Math.round(baseFare * 0.10 * 100) / 100;
    discount += scDiscount;
    discountLabel = 'Smart Card 10% off';
  }

  if (mjqrt && offPeak && !holiday) {
    const mjqrtDiscount = Math.round(baseFare * 0.20 * 100) / 100;
    discount += mjqrtDiscount;
    discountLabel = discountLabel ? `${discountLabel} + MJQRT 20% off-peak` : 'MJQRT 20% off-peak';
  }

  const finalFare = Math.max(0, Math.round((baseFare - discount) * 100) / 100);

  return {
    token_fare: baseFare,
    smart_card_fare: Math.round(baseFare * 0.90 * 100) / 100,
    mjqrt_offpeak_fare: Math.round(baseFare * 0.80 * 100) / 100,
    final_fare: finalFare,
    discount_applied: discountLabel,
    distance_slab: getDistanceSlabKm(distanceKm),
    day_type: holiday ? 'Sunday/Holiday' : 'Weekday',
    peak_status: offPeak ? 'Off-Peak' : 'Peak',
    line: 'Delhi Metro',
  };
}

function predictFare(fromName, toName, options = {}) {
  const stations = loadStations();
  const fromStation = stations.find(
    (s) => s.name.toLowerCase() === fromName.toLowerCase()
  );
  const toStation = stations.find(
    (s) => s.name.toLowerCase() === toName.toLowerCase()
  );

  if (!fromStation || !toStation) return null;

  const directDistance = haversineKm(
    fromStation.lat, fromStation.lon,
    toStation.lat, toStation.lon
  );

  const route = findRoute(fromName, toName);
  let routeDistance = directDistance;
  let travelTime = null;
  let interchanges = 0;

  if (route) {
    travelTime = route.totalTime;
    interchanges = route.interchanges;
    routeDistance = Math.max(directDistance, route.totalTime * 0.55);
  }

  const fare = calculateFare(routeDistance, options);

  const timeLimit = routeDistance <= 12 ? 65 : routeDistance <= 21 ? 100 : 180;

  return {
    from: fromStation.name,
    to: toStation.name,
    direct_distance_km: Math.round(directDistance * 100) / 100,
    estimated_route_km: Math.round(routeDistance * 100) / 100,
    travel_time_min: travelTime ? Math.round(travelTime) : null,
    interchanges,
    fare,
    time_limit_min: timeLimit,
    savings: {
      smart_card: Math.round((fare.token_fare - fare.smart_card_fare) * 100) / 100,
      mjqrt_offpeak: Math.round((fare.token_fare - fare.mjqrt_offpeak_fare) * 100) / 100,
    },
  };
}

function getAllStationFares(fromName, options = {}) {
  const stations = loadStations();
  const fromStation = stations.find(
    (s) => s.name.toLowerCase() === fromName.toLowerCase()
  );
  if (!fromStation) return null;

  const fares = stations
    .filter((s) => s.name !== fromName)
    .map((s) => {
      const dist = haversineKm(fromStation.lat, fromStation.lon, s.lat, s.lon);
      const fare = calculateFare(dist, options);
      return {
        station: s.name,
        distance_km: Math.round(dist * 100) / 100,
        fare: fare.final_fare,
        token_fare: fare.token_fare,
      };
    })
    .sort((a, b) => a.fare - b.fare);

  return {
    from: fromStation.name,
    total_destinations: fares.length,
    fare_distribution: {
      '11': fares.filter((f) => f.fare === 11).length,
      '21': fares.filter((f) => f.fare === 21).length,
      '32': fares.filter((f) => f.fare === 32).length,
      '43': fares.filter((f) => f.fare === 43).length,
      '54': fares.filter((f) => f.fare === 54).length,
      '64': fares.filter((f) => f.fare === 64).length,
    },
    cheapest: fares.slice(0, 5),
    most_expensive: fares.slice(-5).reverse(),
    average_fare: Math.round(fares.reduce((s, f) => s + f.fare, 0) / fares.length),
  };
}

function getFareChart() {
  return {
    weekday: FARE_SLABS_WEEKDAY.map((s) => ({
      distance: s.maxKm === Infinity ? '>32 km' : `≤${s.maxKm} km`,
      fare: `₹${s.fare}`,
      smart_card: `₹${Math.round(s.fare * 0.90)}`,
      savings: `₹${Math.round(s.fare * 0.10)}`,
    })),
    sunday_holiday: FARE_SLABS_HOLIDAY.map((s) => ({
      distance: s.maxKm === Infinity ? '>32 km' : `≤${s.maxKm} km`,
      fare: `₹${s.fare}`,
      smart_card: `₹${Math.round(s.fare * 0.90)}`,
    })),
    airport_express: AIRPORT_EXPRESS_FARES.map((s) => ({
      distance: s.maxKm === Infinity ? '>20 km' : `≤${s.maxKm} km`,
      fare: `₹${s.fare}`,
    })),
    discounts: {
      smart_card: '10% off every journey',
      mjqrt: '20% off during off-peak hours (before 8 AM, 12–5 PM, after 9 PM)',
    },
    off_peak_hours: OFF_PEAK_WINDOWS.map((w) => `${w.start} – ${w.end}`),
    time_limits: [
      { distance: '≤12 km', time: '65 min' },
      { distance: '12–21 km', time: '100 min' },
      { distance: '>21 km', time: '180 min' },
    ],
  };
}

module.exports = {
  calculateFare,
  predictFare,
  getAllStationFares,
  getFareChart,
  haversineKm,
  isHoliday,
  isOffPeak,
  FARE_SLABS_WEEKDAY,
  FARE_SLABS_HOLIDAY,
};
