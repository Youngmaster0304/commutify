const { Client } = require('@elastic/elasticsearch');

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';

let client = null;

function getClient() {
  if (!client) {
    client = new Client({ node: ES_NODE });
  }
  return client;
}

const STATION_INDEX = 'metro_stations';
const LOST_FOUND_INDEX = 'lost_found_items';

const STATION_MAPPING = {
  mappings: {
    properties: {
      name: { type: 'text', fields: { keyword: { type: 'keyword' }, autocomplete: { type: 'completion' } } },
      lines: { type: 'keyword' },
      location: { type: 'geo_point' },
      opened: { type: 'date', format: 'dd-MM-yyyy' },
      layout: { type: 'keyword' },
      interchange: { type: 'boolean' },
    },
  },
};

const LOST_FOUND_MAPPING = {
  mappings: {
    properties: {
      item_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
          fuzzy: { type: 'text', analyzer: 'standard' },
          autocomplete: { type: 'completion' },
        },
      },
      description: { type: 'text' },
      quantity: { type: 'integer' },
      station: { type: 'keyword' },
      station_raw: { type: 'keyword' },
      date: { type: 'date', format: 'dd/MM/yyyy' },
      time: { type: 'keyword' },
      location: { type: 'geo_point' },
    },
  },
};

async function ensureIndices() {
  const c = getClient();

  const stationExists = await c.indices.exists({ index: STATION_INDEX });
  if (!stationExists) {
    await c.indices.create({ index: STATION_INDEX, body: STATION_MAPPING });
  }

  const lfExists = await c.indices.exists({ index: LOST_FOUND_INDEX });
  if (!lfExists) {
    await c.indices.create({ index: LOST_FOUND_INDEX, body: LOST_FOUND_MAPPING });
  }
}

async function ingestStations(stations) {
  const c = getClient();
  await ensureIndices();

  const body = [];
  for (const s of stations) {
    body.push({ index: { _index: STATION_INDEX, _id: s.name } });
    body.push({
      name: s.name,
      lines: s.lines,
      location: { lat: s.lat, lon: s.lon },
      opened: s.opened,
      layout: s.layout,
      interchange: s.interchange,
    });
  }
  await c.bulk({ body, refresh: true });
  return stations.length;
}

async function ingestLostFound(records, stations) {
  const c = getClient();
  await ensureIndices();

  const stationMap = new Map(stations.map((s) => [s.name, s]));
  const body = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const loc = r.station_matched ? stationMap.get(r.station_matched) : null;
    body.push({ index: { _index: LOST_FOUND_INDEX, _id: String(i + 1) } });
    body.push({
      item_name: r.item_name,
      description: r.description,
      quantity: parseInt(r.quantity, 10) || 0,
      station: r.station_matched || null,
      station_raw: r.station_raw,
      date: r.date,
      time: r.time,
      ...(loc ? { location: { lat: loc.lat, lon: loc.lon } } : {}),
    });
  }
  await c.bulk({ body, refresh: true });
  return records.length;
}

async function autocomplete(query) {
  const c = getClient();
  const result = await c.search({
    index: STATION_INDEX,
    body: {
      suggest: {
        station_suggest: {
          prefix: query,
          completion: { field: 'name.autocomplete', size: 10, fuzzy: { fuzziness: 'AUTO' } },
        },
      },
    },
  });
  return result.body.suggest.station_suggest[0].options.map((o) => ({
    name: o._source.name,
    lines: o._source.lines,
    interchange: o._source.interchange,
    score: o._score,
  }));
}

async function searchLostItems(query, stationFilter) {
  const c = getClient();
  const must = [];
  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['item_name^3', 'item_name.fuzzy^2', 'description'],
        fuzziness: 'AUTO',
      },
    });
  }
  if (stationFilter) {
    must.push({ term: { station: stationFilter } });
  }
  const result = await c.search({
    index: LOST_FOUND_INDEX,
    body: {
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      size: 50,
      sort: [{ date: { order: 'desc' } }],
    },
  });
  return result.body.hits.hits.map((h) => ({ id: h._id, ...h._source }));
}

async function nearbyLostItems(lat, lon, radiusKm = 5) {
  const c = getClient();
  const result = await c.search({
    index: LOST_FOUND_INDEX,
    body: {
      query: {
        bool: {
          must: { match_all: {} },
          filter: {
            geo_distance: {
              distance: `${radiusKm}km`,
              location: { lat, lon },
            },
          },
        },
      },
      size: 50,
      sort: [{ _geo_distance: { location: { lat, lon }, order: 'asc', unit: 'km' } }],
    },
  });
  return result.body.hits.hits.map((h) => ({ id: h._id, ...h._source }));
}

async function lostItemHotspots() {
  const c = getClient();
  const result = await c.search({
    index: LOST_FOUND_INDEX,
    body: {
      size: 0,
      aggs: {
        by_station: {
          terms: { field: 'station', size: 50, order: { _count: 'desc' } },
        },
      },
    },
  });
  return result.body.aggregations.by_station.buckets.map((b) => ({
    station: b.key,
    count: b.doc_count,
  }));
}

module.exports = {
  getClient,
  ensureIndices,
  ingestStations,
  ingestLostFound,
  autocomplete,
  searchLostItems,
  nearbyLostItems,
  lostItemHotspots,
  STATION_INDEX,
  LOST_FOUND_INDEX,
};
