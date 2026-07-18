const LINE_COLORS = {
  'Yellow line': '#FFD700',
  'Blue line': '#0066CC',
  'Blue line branch': '#3399FF',
  'Red line': '#FF3333',
  'Green line': '#33AA33',
  'Green line branch': '#66CC66',
  'Violet line': '#9933CC',
  'Voilet line': '#9933CC',
  'Orange line': '#FF9933',
  'Pink line': '#FF66B2',
  'Magenta line': '#FF00FF',
  'Gray line': '#999999',
  'Aqua line': '#00CCCC',
  'Rapid Metro': '#FF6600',
};

const LINE_SHORT = {
  'Yellow line': 'YL',
  'Blue line': 'BL',
  'Blue line branch': 'BLB',
  'Red line': 'RL',
  'Green line': 'GL',
  'Green line branch': 'GLB',
  'Violet line': 'VL',
  'Voilet line': 'VL',
  'Orange line': 'OL',
  'Pink line': 'PL',
  'Magenta line': 'ML',
  'Gray line': 'GL',
  'Aqua line': 'AL',
  'Rapid Metro': 'RM',
};

function getLineColor(line) {
  return LINE_COLORS[line] || '#666';
}

function getLineShort(line) {
  return LINE_SHORT[line] || line.slice(0, 2).toUpperCase();
}

const COACH_TIPS = {
  'Rajiv Chowk': 'Board coaches 4-6 for Blue line interchange, 1-3 for Yellow line',
  'Kashmere Gate': 'Board coaches 1-3 for Red line, 4-6 for Yellow/Violet line',
  'Mandi House': 'Board coaches 4-6 for Violet line interchange',
  'Hauz Khas': 'Board coaches 1-3 for Yellow line, 4-6 for Magenta line',
  'Janakpuri West': 'Board coaches 1-3 for Blue line branch interchange',
  'Dwarka Sector 21': 'Board coaches 4-6 for Blue line branch',
  'Noida Sector 52': 'Board coaches 1-3 for Blue line, 4-6 for Aqua line',
  'Botanical Garden': 'Board coaches 4-6 for Magenta line interchange',
  'Yashobhoomi Dwarka Sector 25': 'Board coaches 1-3 for Magenta line',
  'New Delhi': 'Board coaches 1-3 for Yellow line, Airport Express from same platform',
};

const LAST_MILE = {
  'AIIMS': 'Auto stand outside gate 1, ~1 km to AIIMS hospital',
  'Rajiv Chowk': 'Multiple e-rickshaw stands, Connaught Place within walking distance',
  'Kashmere Gate': 'ISBT adjacent, cycle-rickshaws available at gate 2',
  'Chandni Chowk': 'Walking distance to Old Delhi, cycle-rickshaws recommended',
  'Jama Masjid': 'Walking distance to Jama Masjid (~500m)',
  'Pragati Maidan': 'Auto stand at gate 4, exhibition complex within walking distance',
  'Dilli Haat INA': 'Auto stand at gate, Dilli Haat at walking distance',
  'Noida Sector 18': 'Walk to Atta Market (~800m), autos available',
  'Huda City Centre': 'Auto stand at gate 1, Golf Course Road accessible',
  'Dwarka Sector 21': 'Feeder buses to Dwarka sub-city areas',
  'IGI Airport': 'Airport terminal shuttle from gate, T3 within walking distance',
  'New Delhi': 'Cycle-rickshaws to Paharganj (~500m), autos to Connaught Place',
  'Yashobhoomi Dwarka Sector 25': 'Auto stand at gate, convention center shuttle available',
};

module.exports = { LINE_COLORS, LINE_SHORT, getLineColor, getLineShort, COACH_TIPS, LAST_MILE };
