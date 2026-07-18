import pandas as pd, re, json, difflib
from collections import defaultdict

# ---------- 1. STATIONS ----------
df = pd.read_csv('/mnt/user-data/uploads/Delhi_metro.csv')

CONN_MAP = {
    'Pink':'Pink line','Violet':'Voilet line','Yellow':'Yellow line','Green':'Green line',
    'Orange':'Orange line','Blue':'Blue line','Magenta':'Magenta line','Rapid':'Rapid Metro',
    'Gray':'Gray line','Aqua':'Aqua line','Red':'Red line'
}

def clean_name(raw):
    n = raw
    n = re.sub(r'\[Conn:[^\]]*\]', '', n)          # strip [Conn: X,Y]
    n = re.sub(r'\(First [Ss]tation\)', '', n)      # strip (First Station)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def conn_lines(raw):
    m = re.search(r'\[Conn:\s*([^\]]*)\]', raw)
    if not m: return []
    parts = [p.strip() for p in m.group(1).split(',')]
    return [CONN_MAP.get(p, p) for p in parts]

stations = {}
for _, row in df.iterrows():
    name = clean_name(row['Station Names'])
    line = row['Metro Line']
    lines = {line} | set(conn_lines(row['Station Names']))
    if name not in stations:
        stations[name] = {
            'name': name,
            'lines': set(lines),
            'lat': row['Latitude'],
            'lon': row['Longitude'],
            'opened': row['Opened(Year)'],
            'layout': row['Layout'],
        }
    else:
        stations[name]['lines'] |= lines

for s in stations.values():
    s['lines'] = sorted(s['lines'])
    s['interchange'] = len(s['lines']) > 1

stations_out = sorted(stations.values(), key=lambda s: s['name'])
with open('/home/claude/join/stations.json','w') as f:
    json.dump(stations_out, f, indent=1)

n_interchange = sum(1 for s in stations_out if s['interchange'])
print(f"STATIONS: {len(stations_out)} unique stations, {n_interchange} interchanges, "
      f"{df['Metro Line'].nunique()} raw line tags")

# ---------- 2. LOST & FOUND JOIN ----------
lf = pd.read_csv('/mnt/user-data/uploads/delhimetrorail.csv')

def normalize(s):
    s = str(s).upper()
    s = re.sub(r'\([^)]*\)', '', s)     # drop parenthetical qualifiers
    s = re.sub(r'[^A-Z0-9 ]', ' ', s)   # strip punctuation
    s = re.sub(r'\s+', ' ', s).strip()
    return s

station_lookup = {normalize(s['name']): s['name'] for s in stations_out}

matched, unmatched = 0, defaultdict(int)
records = []
for _, row in lf.iterrows():
    raw = row['station_name']
    norm = normalize(raw)
    canon = station_lookup.get(norm)
    if canon is None:
        # fuzzy fallback
        close = difflib.get_close_matches(norm, station_lookup.keys(), n=1, cutoff=0.72)
        canon = station_lookup.get(close[0]) if close else None
    if canon:
        matched += 1
    else:
        unmatched[raw] += 1
    records.append({
        'item_name': row['item_name'], 'description': row['description'],
        'quantity': row['item_quantity'], 'station_raw': raw, 'station_matched': canon,
        'date': row['receiving_date'], 'time': row['receiving_time']
    })

with open('/home/claude/join/lostfound.json','w') as f:
    json.dump(records, f, indent=1)

print(f"LOST & FOUND: {len(records)} records, {matched} matched ({matched/len(records)*100:.1f}%), "
      f"{len(unmatched)} distinct unmatched station labels")
print("Top unmatched labels:", sorted(unmatched.items(), key=lambda x:-x[1])[:15])
