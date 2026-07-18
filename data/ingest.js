const fs = require('fs');
const path = require('path');
const { ingestStations, ingestLostFound, ensureIndices } = require('../search/elastic');

const DATA_DIR = path.join(__dirname);

async function main() {
  console.log('Loading data files...');
  const stations = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stations.json'), 'utf-8'));
  const lostFound = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lostfound.json'), 'utf-8'));

  console.log(`Loaded ${stations.length} stations, ${lostFound.length} lost-found records`);

  console.log('Ensuring Elasticsearch indices...');
  await ensureIndices();

  console.log('Ingesting stations...');
  const stationCount = await ingestStations(stations);
  console.log(`Ingested ${stationCount} stations`);

  console.log('Ingesting lost-found records...');
  const lfCount = await ingestLostFound(lostFound, stations);
  console.log(`Ingested ${lfCount} lost-found records`);

  console.log('Ingestion complete!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  });
}

module.exports = { main };
