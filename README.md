# Interchange

Delhi NCR Metro, Bus & Lost-and-Found Platform with Fare Prediction.

## Architecture

```
commutify/
├── data/
│   ├── stations.json            261 DMRC stations
│   ├── lostfound.json           13,713 lost-and-found records
│   ├── delhi_bus_routes.csv     2,403 DTC bus routes (99,286 stop records)
│   ├── build.py                 Original Python ingestion script
│   └── ingest.js                Elasticsearch ingestion runner
├── engine/
│   └── routing.js               Dijkstra over station|line graph nodes
├── comparator/
│   └── comparator.js            Metro vs Auto/Cab vs Bus time estimator
├── fare/
│   └── fareEngine.js            2025 DMRC fare prediction (distance + peak/off-peak)
├── bus/
│   └── busEngine.js             Bus route search + arrival time prediction
├── search/
│   └── elastic.js               Elasticsearch client + indices
├── chatbot/
│   └── chatbot.js               Natural language assistant (metro + bus + fare)
├── api/
│   └── server.js                Express REST API (port 3001)
├── docker-compose.yml           Elasticsearch + backend
├── Dockerfile                   Production container
└── package.json
```

## Backend API Reference

Base URL: `http://localhost:3001`

---

### Metro Routing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | All 261 DMRC stations |
| GET | `/api/stations/:name` | Single station by name |
| GET | `/api/route?from=&to=` | Route + mode comparison |
| GET | `/api/compare?from=&to=` | Metro vs Auto/Cab vs Bus |

**`GET /api/route?from=AIIMS&to=Rajiv Chowk`**
```json
{
  "route": {
    "path": [{"station":"AIIMS","line":"Yellow line"}, ...],
    "totalTime": 17.5,
    "interchanges": 0,
    "fare": 20,
    "segments": [{"line":"Yellow line","stations":["AIIMS","Dilli Haat INA",...]}]
  },
  "comparison": {
    "distanceKm": 7.2,
    "modes": [
      {"name":"Metro","time":17.5,"fastest":true},
      {"name":"Auto·Cab","time":29.3,"fastest":false},
      {"name":"Bus","time":36.8,"fastest":false}
    ],
    "fastestMode": "Metro",
    "flagInterchange": false
  }
}
```

---

### Fare Prediction (2025 DMRC Rates)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fare/predict?from=&to=` | Fare with distance + peak/off-peak |
| GET | `/api/fare/chart` | Full fare chart (weekday/holiday/airport) |
| GET | `/api/fare/from/:station` | Fare from station to all others |

**Query params for `/api/fare/predict`:**
- `from` / `to` — station names (required)
- `date` — DD-MM-YYYY format (optional, detects holidays)
- `time` — HH:MM:SS format (optional, detects peak/off-peak)
- `smart_card` — `true` for 10% discount
- `mjqrt` — `true` for 20% off-peak discount
- `airport_express` — `true` for Airport Express line fares

**Response:**
```json
{
  "from": "AIIMS",
  "to": "Rajiv Chowk",
  "direct_distance_km": 7.2,
  "estimated_route_km": 9.6,
  "travel_time_min": 18,
  "interchanges": 0,
  "fare": {
    "token_fare": 32,
    "smart_card_fare": 28.8,
    "mjqrt_offpeak_fare": 25.6,
    "final_fare": 28.8,
    "discount_applied": "Smart Card 10% off",
    "distance_slab": "≤12",
    "day_type": "Weekday",
    "peak_status": "Peak",
    "line": "Delhi Metro"
  },
  "time_limit_min": 65,
  "savings": { "smart_card": 3.2, "mjqrt_offpeak": 6.4 }
}
```

**Fare Slabs (Aug 2025 revision):**

| Distance | Weekday | Sunday/Holiday |
|----------|---------|----------------|
| 0–2 km | ₹11 | ₹11 |
| 2–5 km | ₹21 | ₹11 |
| 5–12 km | ₹32 | ₹21 |
| 12–21 km | ₹43 | ₹32 |
| 21–32 km | ₹54 | ₹43 |
| >32 km | ₹64 | ₹54 |

Smart Card: 10% off every trip. MJQRT: 20% off during off-peak (before 8 AM, 12–5 PM, after 9 PM).

---

### Bus Commute (Kaggle Dataset)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bus/stats` | Route/stop/trip counts |
| GET | `/api/bus/search?q=` | Search bus stops by name |
| GET | `/api/bus/nearby?lat=&lon=&radius=` | Nearby bus stops |
| GET | `/api/bus/routes?from=&to=` | Direct bus routes between stops |
| GET | `/api/bus/predict?from=&to=&departure=` | Arrival time prediction |

**Dataset:** 2,403 routes, 3,888 stops, 99,286 stop records from `final_merged_with_stops.csv`

**`GET /api/bus/predict?from=Najafgarh Terminal&to=Dhansa Stand&departure=12:45:00`**
```json
{
  "from": "Najafgarh Terminal",
  "to": "Dhansa Stand",
  "departure": "12:45:00",
  "best_prediction": {
    "route_id": "142",
    "departure": "12:50:00",
    "arrival": "12:57:10",
    "duration_min": 7.2,
    "wait_min": 5,
    "total_journey_min": 12.2,
    "stops_between": 5,
    "confidence": "medium",
    "stops": [...]
  },
  "alternatives": [...],
  "total_options": 13
}
```

---

### Lost & Found

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/lost-items?q=&station=` | Fuzzy item search |
| GET | `/api/search/nearby?lat=&lon=&radius=` | Geo-proximity search |
| GET | `/api/search/hotspots` | Top lost-item stations |
| POST | `/api/lost-items` | Submit report `{item_name, description, quantity, station, type}` |

---

### Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Natural language query `{message}` |

**Supported intents:** greetings, route planning, bus commute, lost & found, hotspots, station info, line info, fare calculation, travel time, interchanges, coach tips, last-mile info.

---

## Quick Start

### Backend Only (for Antigravity frontend)

```bash
cd commutify
npm install
node api/server.js
# API running at http://localhost:3001
```

### With Docker (full stack)

```bash
docker compose up -d
docker compose exec backend node data/ingest.js
# Open http://localhost:3001
```

### Re-running Data Ingestion

If `stations.json` or `lostfound.json` change:
```bash
python data/build.py
node data/ingest.js  # re-index into Elasticsearch
```

## Data Sources

| Dataset | Records | Source |
|---------|---------|--------|
| `stations.json` | 261 stations | Delhi_metro.csv (cleaned) |
| `lostfound.json` | 13,713 records | delhimetrorail.csv (93.7% matched) |
| `delhi_bus_routes.csv` | 99,286 records | Kaggle: lourduradjou/delhi-bus-routes-dataset |

## Tech Stack

- **Backend:** Node.js + Express
- **Data:** JSON files + Elasticsearch (optional)
- **Routing:** Dijkstra over `station|line` graph nodes
- **Fare:** 2025 DMRC slab-based with peak/off-peak/holiday logic
- **Bus:** Kaggle dataset with schedule-based arrival prediction
- **Chatbot:** Intent-based NLP with local metro/bus/fare knowledge
