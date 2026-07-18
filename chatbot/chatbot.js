const { findRoute, loadStations } = require('../engine/routing');
const { compareModes } = require('../comparator/comparator');
const bus = require('../bus/busEngine');
const fare = require('../fare/fareEngine');
const fs = require('fs');
const path = require('path');

const GEMMA_API_KEY = process.env.GEMMA_API_KEY || '';

let lostFoundData = null;

function loadLostFound() {
  if (!lostFoundData) {
    lostFoundData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'lostfound.json'), 'utf-8')
    );
  }
  return lostFoundData;
}

function findStationFuzzy(query, stations) {
  const q = query.toLowerCase().trim();
  const exact = stations.find((s) => s.name.toLowerCase() === q);
  if (exact) return exact;
  const starts = stations.filter((s) => s.name.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];
  const includes = stations.filter((s) => s.name.toLowerCase().includes(q));
  if (includes.length === 1) return includes[0];
  if (includes.length > 0) return includes[0];
  const words = q.split(/\s+/);
  const multiWord = stations.filter((s) => words.every((w) => s.name.toLowerCase().includes(w)));
  if (multiWord.length === 1) return multiWord[0];
  if (multiWord.length > 0) return multiWord[0];
  return null;
}

function extractStations(text, stations) {
  const found = [];
  const used = new Set();
  const sorted = [...stations].sort((a, b) => b.name.length - a.name.length);
  let remaining = text;
  for (const s of sorted) {
    const idx = remaining.toLowerCase().indexOf(s.name.toLowerCase());
    if (idx !== -1 && !used.has(s.name)) {
      found.push(s.name);
      used.add(s.name);
      remaining = remaining.slice(0, idx) + remaining.slice(idx + s.name.length);
    }
  }
  return found;
}

function getStationInfo(stationName, stations) {
  const s = findStationFuzzy(stationName, stations);
  if (!s) return null;
  const lines = s.lines.join(', ');
  const opened = s.opened || 'Unknown';
  const layout = s.layout || 'Unknown';
  const interchange = s.interchange ? 'Yes (interchange station)' : 'No';
  return `**${s.name}**
- Lines: ${lines}
- Layout: ${layout}
- Interchange: ${interchange}
- Opened: ${opened}
- Coordinates: ${s.lat}, ${s.lon}`;
}

function getRouteInfo(from, to) {
  const route = findRoute(from, to);
  if (!route) return null;
  const comparison = compareModes(route, from, to);
  const time = Math.round(route.totalTime);
  const interchanges = route.interchanges;
  const fare = route.fare;
  let segments = route.segments.map((seg, i) => {
    const stops = seg.stations.length;
    const from = seg.stations[0];
    const to = seg.stations[stops - 1];
    return `  ${i + 1}. **${seg.line}**: ${from} → ${to} (${stops} stops)`;
  }).join('\n');
  const fastest = comparison ? comparison.modes.find((m) => m.fastest) : null;
  let msg = `🚇 **Route: ${from} → ${to}**
- Travel time: ${time} minutes
- Interchanges: ${interchanges}
- Fare: ₹${fare}
- Segments:\n${segments}`;
  if (fastest && fastest.name !== 'Metro') {
    msg += `\n- Tip: ${fastest.name} is faster (${Math.round(fastest.time)} min) for this route.`;
  }
  return msg;
}

function getLostFoundInfo(query, station) {
  const records = loadLostFound();
  let filtered = records;
  if (station) {
    filtered = filtered.filter(
      (r) => r.station_matched && r.station_matched.toLowerCase().includes(station.toLowerCase())
    );
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.item_name && String(r.item_name).toLowerCase().includes(q)) ||
        (r.description && String(r.description).toLowerCase().includes(q))
    );
  }
  if (filtered.length === 0) return 'No lost items found matching your criteria.';
  const top = filtered.slice(0, 5);
  let msg = `Found ${filtered.length} items. Showing top ${top.length}:\n\n`;
  top.forEach((r, i) => {
    msg += `${i + 1}. **${r.item_name}** — ${String(r.description || 'No description')}
   Station: ${r.station_matched || r.station_raw} | Date: ${r.date}\n\n`;
  });
  return msg;
}

function getHotspotInfo() {
  const records = loadLostFound();
  const counts = {};
  records.forEach((r) => {
    const st = r.station_matched || r.station_raw;
    if (st) counts[st] = (counts[st] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  let msg = '📊 **Top 10 Lost-Item Hotspots:**\n\n';
  sorted.forEach(([station, count], i) => {
    msg += `${i + 1}. ${station} — ${count} items\n`;
  });
  return msg;
}

function getLineInfo(lineName, stations) {
  const q = lineName.toLowerCase().replace(/line/g, '').trim();
  const matching = stations.filter((s) =>
    s.lines.some((l) => l.toLowerCase().includes(q))
  );
  if (matching.length === 0) return null;
  const line = matching[0].lines.find((l) => l.toLowerCase().includes(q));
  const first = matching[0].name;
  const last = matching[matching.length - 1].name;
  return `🚇 **${line}**
- Stations: ${matching.length}
- Route: ${first} → ${last}
- Interchange stations: ${matching.filter((s) => s.interchange).map((s) => s.name).join(', ') || 'None'}`;
}

function extractBusStops(text) {
  const data = bus.loadBusData();
  const found = [];
  const used = new Set();
  const sortedStops = Object.values(data.stopsByName).sort((a, b) => b.stop_name.length - a.stop_name.length);
  let remaining = text;
  for (const s of sortedStops) {
    const idx = remaining.toLowerCase().indexOf(s.stop_name.toLowerCase());
    if (idx !== -1 && !used.has(s.stop_name)) {
      found.push(s.stop_name);
      used.add(s.stop_name);
      remaining = remaining.slice(0, idx) + remaining.slice(idx + s.stop_name.length);
    }
  }
  return found;
}

function getBusRouteInfo(from, to) {
  const fromStops = bus.findStopsByName(from);
  const toStops = bus.findStopsByName(to);
  if (fromStops.length === 0 || toStops.length === 0) return null;
  const routes = bus.findBusRoutes(fromStops[0], toStops[0]);
  if (routes.length === 0) return null;
  const now = new Date().toTimeString().slice(0, 8);
  const predictions = bus.predictArrival(fromStops[0], toStops[0], now);
  const best = predictions ? predictions[0] : routes[0];
  return `🚌 **Bus Route: ${fromStops[0].stop_name} → ${toStops[0].stop_name}**
- Route: #${best.route_id}
- Departure: ${best.departure}
- Arrival: ${best.arrival}
- Duration: ~${best.duration_min} min
- Stops: ${best.stops_between}
- Total journey: ~${best.total_journey_min || best.duration_min} min`;
}

const GREETINGS = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening'];
const HELP_KEYWORDS = ['help', 'what can you do', 'features', 'commands'];

function detectIntent(text) {
  const lower = text.toLowerCase();
  if (GREETINGS.some((g) => lower.startsWith(g) || lower === g)) return 'greeting';
  if (HELP_KEYWORDS.some((k) => lower.includes(k))) return 'help';
  if (lower.includes('hotspot') || lower.includes('most common') || lower.includes('frequently') || lower.includes('most lost') || lower.includes('most items') || lower.includes('lose the most')) return 'hotspot';
  if (lower.includes('bus') || lower.includes('dtc') || lower.includes('depot')) return 'bus';
  if (lower.includes('lost') || lower.includes('found') || lower.includes('missing') || lower.includes('item')) return 'lost_found';
  if (lower.includes('route') || lower.includes('from') || lower.includes('to') || lower.includes('go to') || lower.includes('how to reach') || lower.includes('direction')) return 'route';
  if (lower.includes('line') && !lower.includes('from') && !lower.includes('to')) return 'line_info';
  if (lower.includes('station') || lower.includes('tell me about') || lower.includes('info about')) return 'station_info';
  if (lower.includes('fare') || lower.includes('price') || lower.includes('cost') || lower.includes('ticket')) return 'fare';
  if (lower.includes('time') || lower.includes('how long') || lower.includes('duration')) return 'time';
  if (lower.includes('interchange') || lower.includes('transfer')) return 'interchange';
  if (lower.includes('coach') || lower.includes('which coach') || lower.includes('board')) return 'coach';
  if (lower.includes('last mile') || lower.includes('auto') || lower.includes('cab')) return 'last_mile';
  return 'general';
}

async function processMessage(userMessage) {
  const stations = loadStations();
  const intent = detectIntent(userMessage);
  let context = '';

  try {
    switch (intent) {
      case 'route': {
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 2) {
          context = getRouteInfo(extracted[0], extracted[1]) || '';
        }
        break;
      }
      case 'station_info': {
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 1) {
          context = getStationInfo(extracted[0], stations) || '';
        }
        break;
      }
      case 'lost_found': {
        const extracted = extractStations(userMessage, stations);
        const station = extracted.length > 0 ? extracted[0] : null;
        const itemWords = userMessage
          .replace(/lost|found|missing|item|at|in|from|my|the|a|an/gi, '')
          .trim();
        const query = itemWords.length > 2 ? itemWords : null;
        context = getLostFoundInfo(query, station) || '';
        break;
      }
      case 'hotspot':
        context = getHotspotInfo() || '';
        break;
      case 'line_info': {
        const lower = userMessage.toLowerCase();
        const lineNames = [
          'Yellow line', 'Blue line', 'Red line', 'Green line', 'Violet line',
          'Orange line', 'Pink line', 'Magenta line', 'Gray line', 'Aqua line',
          'Rapid Metro', 'Blue line branch', 'Green line branch',
        ];
        const found = lineNames.find((l) => lower.includes(l.toLowerCase().replace(' line', '')));
        if (found) {
          context = getLineInfo(found, stations) || '';
        }
        break;
      }
      case 'fare': {
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 2) {
          const result = fare.predictFare(extracted[0], extracted[1]);
          if (result) {
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const holiday = fare.isHoliday(dateStr) || now.getDay() === 0;
            const offPeak = fare.isOffPeak(timeStr);
            context = `💰 **Fare: ${extracted[0]} → ${extracted[1]}**
- Distance: ~${result.estimated_route_km} km
- Token fare: ₹${result.fare.token_fare}
- Smart Card: ₹${result.fare.smart_card_fare} (10% off)
- MJQRT Off-Peak: ₹${result.fare.mjqrt_offpeak_fare} (20% off)
- Day type: ${holiday ? 'Sunday/Holiday' : 'Weekday'}
- Peak status: ${offPeak ? 'Off-Peak (MJQRT 20% off available)' : 'Peak'}`;
            if (result.savings) {
              context += `\n- Monthly savings (Smart Card): ₹${result.savings.smart_card * 44}`;
            }
          }
        }
        break;
      }
      case 'time': {
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 2) {
          const route = findRoute(extracted[0], extracted[1]);
          if (route) context = `⏱️ **Travel time:** ~${Math.round(route.totalTime)} minutes for ${extracted[0]} → ${extracted[1]}`;
        }
        break;
      }
      case 'interchange': {
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 2) {
          const route = findRoute(extracted[0], extracted[1]);
          if (route) {
            if (route.interchanges === 0) {
              context = `✅ No interchanges needed for ${extracted[0]} → ${extracted[1]}!`;
            } else {
              context = `🔄 **${route.interchanges} interchange(s)** required for ${extracted[0]} → ${extracted[1]}:
${route.segments.map((s, i) => `${i + 1}. ${s.line} (${s.stations[0]} → ${s.stations[s.stations.length - 1]})`).join('\n')}`;
            }
          }
        }
        break;
      }
      case 'coach': {
        const COACH_TIPS = {
          'Rajiv Chowk': 'Board coaches 4-6 for Blue line interchange, 1-3 for Yellow line',
          'Kashmere Gate': 'Board coaches 1-3 for Red line, 4-6 for Yellow/Violet line',
          'Mandi House': 'Board coaches 4-6 for Violet line interchange',
          'Hauz Khas': 'Board coaches 1-3 for Yellow line, 4-6 for Magenta line',
          'Central Secretariat': 'Board coaches 1-3 for Yellow line, 4-6 for Violet line',
        };
        const extracted = extractStations(userMessage, stations);
        if (extracted.length >= 1 && COACH_TIPS[extracted[0]]) {
          context = `Coaches tips for ${extracted[0]}: ${COACH_TIPS[extracted[0]]}`;
        }
        break;
      }
      case 'bus': {
        const busStops = extractBusStops(userMessage);
        if (busStops.length >= 2) {
          context = getBusRouteInfo(busStops[0], busStops[1]) || '';
        } else if (busStops.length === 1) {
          const stops = bus.findStopsByName(busStops[0]);
          if (stops.length > 0) {
            const s = stops[0];
            context = `🚌 **${s.stop_name}**
- Available routes: ${s.routes.length}
- Coordinates: ${s.stop_lat}, ${s.stop_lon}`;
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Error fetching context:', e);
  }

  // Define system instructions
  const systemPrompt = `You are Commutify AI, a helpful Delhi Metro & DTC Bus transit assistant.
You help users plan journeys, estimate fares, look up lost items, check bus routes, and optimize travel times.

Here is the local database context related to the user's query:
---
${context || 'No local database context matched.'}
---

CRITICAL FORMATTING RULES — you MUST follow these exactly:
1. NEVER use LaTeX math syntax. Do NOT write $\\rightarrow$, $\\to$, \\rightarrow, or any $...$ math expressions. Use plain Unicode arrows → instead.
2. Use only plain Markdown: **bold**, *italic*, bullet lists with "- ", numbered lists "1. ", headings with "## ".
3. Always use → (Unicode right arrow) for route directions, never LaTeX.
4. Prioritize using facts from the local database context above if it matches the query.
5. For route and fare queries, format with clear markdown bullet points and segment lists.
6. If no local context is provided, use your general knowledge about Delhi Metro to answer accurately.
7. Keep answers friendly, concise, and informative. Use relevant emojis.
8. Example of correct format: "Yellow Line: Rajiv Chowk → AIIMS → Hauz Khas"`;

  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMMA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemma-4-31b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
    }
    console.warn("Cerebras API returned status:", response.status);
  } catch (err) {
    console.error("Cerebras API call failed:", err);
  }

  // Fallback to rule-based reply if API is down
  return fallbackMessage(intent, userMessage, stations);
}

function fallbackMessage(intent, userMessage, stations) {
  switch (intent) {
    case 'greeting':
      return `👋 Namaste! I'm the Interchange assistant. I can help you with:
- 🗺️ **Metro routes** — "How do I get from AIIMS to Rajiv Chowk?"
- 🚌 **Bus commute** — "Bus from Najafgarh Terminal to Dhansa Stand"
- 🔎 **Lost & Found** — "I lost my wallet at Kashmere Gate"
- 📊 **Hotspots** — "Which stations have the most lost items?"
- ℹ️ **Station info** — "Tell me about Rajiv Chowk station"
- 🚇 **Line info** — "Tell me about the Blue line"
- 💰 **Fare info** — "What's the fare from X to Y?"`;
    case 'help':
      return `Try asking naturally:
- "Route from AIIMS to Rajiv Chowk"
- "Bus from Najafgarh Terminal to Dhansa Stand"
- "I lost my bag at Rajiv Chowk"`;
    case 'route': {
      const extracted = extractStations(userMessage, stations);
      if (extracted.length >= 2) return getRouteInfo(extracted[0], extracted[1]);
      return `I couldn't identify both stations. Try: "Route from AIIMS to Rajiv Chowk"`;
    }
    case 'station_info': {
      const extracted = extractStations(userMessage, stations);
      if (extracted.length >= 1) return getStationInfo(extracted[0], stations);
      return `Which station? Try: "Tell me about Rajiv Chowk"`;
    }
    case 'lost_found': {
      const extracted = extractStations(userMessage, stations);
      const station = extracted.length > 0 ? extracted[0] : null;
      const itemWords = userMessage.replace(/lost|found|missing|item|at|in|from|my|the/gi, '').trim();
      return getLostFoundInfo(itemWords, station);
    }
    case 'hotspot':
      return getHotspotInfo();
    case 'line_info': {
      const lower = userMessage.toLowerCase();
      const lineNames = ['Yellow', 'Blue', 'Red', 'Green', 'Violet', 'Pink', 'Magenta', 'Gray', 'Aqua', 'Rapid Metro'];
      const found = lineNames.find(l => lower.includes(l.toLowerCase()));
      if (found) return getLineInfo(found, stations);
      return `Which line? Yellow, Blue, Red, Green, Violet, Pink, Magenta, Gray, Aqua, Rapid Metro`;
    }
    default:
      return `I'm here to help you navigate Delhi transit! Ask me about routes, fares, buses, or lost items.`;
  }
}

module.exports = { processMessage, detectIntent };
