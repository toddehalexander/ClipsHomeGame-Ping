// Fetch Clippers 2025-26 home games and write to data/games.json
// Requires: BALLDONTLIE_API_KEY env var. Node 20+ (built-in fetch).
import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.balldontlie.io/v1';
const KEY = process.env.BALLDONTLIE_API_KEY;
if (!KEY) throw new Error('Missing BALLDONTLIE_API_KEY');
const headers = { Authorization: KEY };

async function getClippersId() {
  const r = await fetch(`${API}/teams`, { headers });
  if (!r.ok) throw new Error(`teams failed: ${r.status}`);
  const j = await r.json();
  const t = j.data.find(x => x.abbreviation === 'LAC' || /Clippers/i.test(x.full_name));
  if (!t) throw new Error('Clippers team not found');
  return t.id;
}

async function getAllGames(teamId) {
  const params = new URLSearchParams();
  params.append('seasons[]', '2025');        // 2025 == 2025–26 season
  params.append('team_ids[]', String(teamId));
  params.append('per_page', '100');

  let url = `${API}/games?${params.toString()}`;
  let all = [];
  let cursor;
  while (true) {
    const u = cursor ? `${url}&cursor=${cursor}` : url;
    const r = await fetch(u, { headers });
    if (!r.ok) throw new Error(`games failed: ${r.status}`);
    const j = await r.json();
    all = all.concat(j.data || []);
    if (!j.meta || !j.meta.next_cursor) break;
    cursor = j.meta.next_cursor;
  }
  return all;
}

function toHomeGames(games, teamId) {
  return games
    .filter(g => g.home_team?.id === teamId) // home only
    .map(g => ({
      id: g.id,
      date: g.date,                // "YYYY-MM-DD"
      datetime: g.datetime || null, // full ISO with timezone, if available
      opponent: g.visitor_team?.full_name || 'TBD',
      opponent_abbr: g.visitor_team?.abbreviation || 'TBD',
      home_team: g.home_team?.full_name || 'Los Angeles Clippers',
      season: g.season,
      status: g.status
    }))
    .sort((a,b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date));
}

(async () => {
  const teamId = await getClippersId();
  const all = await getAllGames(teamId);
  const home = toHomeGames(all, teamId);

  const out = {
    teamId,
    team: 'Los Angeles Clippers',
    season: 2025,
    generatedAt: new Date().toISOString(),
    homeGames: home
  };

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(path.join('data','games.json'), JSON.stringify(out, null, 2));
  console.log(`Wrote ${home.length} home games to data/games.json`);
})();
