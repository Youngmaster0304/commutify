const path = require('path');
const fs = require('fs');

const TRANSFER_TIME = 5;
const STATION_TIME = 2.5;

let stationsData = null;

function loadStations() {
  if (!stationsData) {
    stationsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'stations.json'), 'utf-8')
    );
  }
  return stationsData;
}

function buildGraph(stations) {
  const adjacency = new Map();

  function addEdge(a, b, weight) {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push({ node: b, weight });
    adjacency.get(b).push({ node: a, weight });
  }

  const stationByName = new Map();
  for (const s of stations) {
    stationByName.set(s.name, s);
  }

  for (const s of stations) {
    for (const line of s.lines) {
      const nodeA = `${s.name}|${line}`;
      adjacency.set(nodeA, []);
    }
  }

  const lineStations = new Map();
  for (const s of stations) {
    for (const line of s.lines) {
      if (!lineStations.has(line)) lineStations.set(line, []);
      lineStations.get(line).push(s);
    }
  }

  for (const [line, list] of lineStations) {
    list.sort((a, b) => {
      if (line === 'Blue line branch') return a.lon - b.lon;
      if (line === 'Green line branch') return a.lat - b.lat;
      return a.lat !== b.lat ? b.lat - a.lat : a.lon - b.lon;
    });

    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      const nodeA = `${a.name}|${line}`;
      const nodeB = `${b.name}|${line}`;
      addEdge(nodeA, nodeB, STATION_TIME);
    }
  }

  for (const s of stations) {
    if (s.lines.length > 1) {
      for (let i = 0; i < s.lines.length; i++) {
        for (let j = i + 1; j < s.lines.length; j++) {
          const nodeA = `${s.name}|${s.lines[i]}`;
          const nodeB = `${s.name}|${s.lines[j]}`;
          addEdge(nodeA, nodeB, TRANSFER_TIME);
        }
      }
    }
  }

  return { adjacency, stationByName };
}

function dijkstra(adjacency, start, end) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  for (const [node] of adjacency) {
    dist.set(node, Infinity);
  }
  dist.set(start, 0);

  while (true) {
    let current = null;
    let minDist = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        current = node;
      }
    }
    if (current === null || current === end) break;
    visited.add(current);

    for (const { node: neighbor, weight } of adjacency.get(current) || []) {
      const alt = dist.get(current) + weight;
      if (alt < dist.get(neighbor)) {
        dist.set(neighbor, alt);
        prev.set(neighbor, current);
      }
    }
  }

  const path = [];
  let current = end;
  while (current && prev.has(current)) {
    path.unshift(current);
    current = prev.get(current);
  }
  if (current === start) {
    path.unshift(start);
    return { path, distance: dist.get(end) };
  }
  return null;
}

function parseNode(nodeStr) {
  const idx = nodeStr.lastIndexOf('|');
  return { station: nodeStr.slice(0, idx), line: nodeStr.slice(idx + 1) };
}

function findRoute(fromName, toName) {
  const stations = loadStations();
  const { adjacency, stationByName } = buildGraph(stations);

  const fromStation = stationByName.get(fromName);
  const toStation = stationByName.get(toName);
  if (!fromStation || !toStation) return null;

  let bestResult = null;

  for (const fromLine of fromStation.lines) {
    for (const toLine of toStation.lines) {
      const startNode = `${fromName}|${fromLine}`;
      const endNode = `${toName}|${toLine}`;
      const result = dijkstra(adjacency, startNode, endNode);
      if (result && (!bestResult || result.distance < bestResult.distance)) {
        bestResult = result;
      }
    }
  }

  if (!bestResult) return null;

  const segments = [];
  let currentLine = null;
  let interchangeCount = 0;
  const segmentStations = [];

  for (const nodeStr of bestResult.path) {
    const { station, line } = parseNode(nodeStr);
    if (line !== currentLine) {
      if (currentLine !== null) {
        interchangeCount++;
        segments.push({
          line: currentLine,
          stations: [...segmentStations],
        });
        segmentStations.length = 0;
      }
      currentLine = line;
    }
    segmentStations.push(station);
  }
  if (segmentStations.length > 0) {
    segments.push({ line: currentLine, stations: segmentStations });
  }

  const fare = computeFare(bestResult.distance);

  return {
    path: bestResult.path.map(parseNode),
    totalTime: bestResult.distance,
    interchanges: interchangeCount,
    fare,
    segments,
  };
}

function computeFare(totalTimeMinutes) {
  if (totalTimeMinutes <= 10) return 10;
  if (totalTimeMinutes <= 20) return 20;
  if (totalTimeMinutes <= 30) return 30;
  if (totalTimeMinutes <= 40) return 40;
  if (totalTimeMinutes <= 50) return 50;
  return 60;
}

module.exports = { findRoute, loadStations, buildGraph, parseNode, STATION_TIME, TRANSFER_TIME };
