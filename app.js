const PT = 'America/Los_Angeles';
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const gameEl = document.getElementById('game');
const noGamesEl = document.getElementById('no-games');
const opponentEl = document.getElementById('opponent');
const datetimeEl = document.getElementById('datetime');
const countdownEl = document.getElementById('countdown');
const futureEl = document.getElementById('future');
const futureListEl = document.getElementById('future-list');

function fmtDateTime(iso) {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat('en-US', { timeZone: PT, weekday:'short', month:'short', day:'numeric' }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', { timeZone: PT, hour:'numeric', minute:'2-digit' }).format(d);
  return `${datePart} • ${timePart} PT`;
}

function startCountdown(iso) {
  const target = new Date(iso).getTime();
  function tick() {
    const now = Date.now();
    let diff = Math.max(0, target - now);
    const ds = Math.floor(diff / 86400000); diff -= ds*86400000;
    const hs = Math.floor(diff / 3600000); diff -= hs*3600000;
    const ms = Math.floor(diff / 60000); diff -= ms*60000;
    const ss = Math.floor(diff / 1000);
    countdownEl.textContent = `${ds}d ${hs}h ${ms}m ${ss}s`;
  }
  tick();
  return setInterval(tick, 1000);
}

async function main() {
  try {
    const res = await fetch('data/games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load schedule`);
    const data = await res.json();

    const now = Date.now();
    const upcoming = (data.homeGames || []).filter(
      g => new Date(g.datetime || `${g.date}T00:00:00Z`).getTime() >= now
    );
    if (!upcoming.length) {
      loadingEl.classList.add('hidden');
      noGamesEl.classList.remove('hidden');
      return;
    }

    // Next game
    const next = upcoming[0];
    const tipISO = next.datetime || `${next.date}T00:00:00Z`;
    opponentEl.textContent = `${next.opponent} @ Clippers`;
    datetimeEl.textContent = fmtDateTime(tipISO);

    loadingEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    startCountdown(tipISO);

    // Future games list
    if (upcoming.length > 1) {
      futureEl.classList.remove('hidden');
      futureListEl.innerHTML = '';
      upcoming.slice(1, 6).forEach(g => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${g.opponent}</span><span>${fmtDateTime(g.datetime || g.date)}</span>`;
        futureListEl.appendChild(li);
      });
    }
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = `Error: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
}
main();
