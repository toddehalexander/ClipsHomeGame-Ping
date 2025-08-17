const PT = 'America/Los_Angeles';
const gameEl = document.getElementById('game');
const opponentEl = document.getElementById('opponent');
const datetimeEl = document.getElementById('datetime');
const countdownEl = document.getElementById('countdown');
const futureEl = document.getElementById('future');
const futureTitleEl = document.getElementById('future-title');
const futureListEl = document.getElementById('future-list');

function fmtDateTime(iso) {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat('en-US', { 
    timeZone: PT, 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', { 
    timeZone: PT, 
    hour: 'numeric', 
    minute: '2-digit' 
  }).format(d);
  return `${datePart} • ${timePart} PT`;
}

// Developer override: Use window.DEV_OVERRIDE_NOW if set, else real current time
function getNow() {
  if (window.DEV_OVERRIDE_NOW) {
    const ovr = new Date(window.DEV_OVERRIDE_NOW);
    if (!isNaN(ovr)) return ovr;
  }
  return new Date();
}

function isSameDayPT(d1, d2) {
  const options = { timeZone: PT, year: 'numeric', month: 'numeric', day: 'numeric' };
  const d1Str = new Intl.DateTimeFormat('en-US', options).format(d1);
  const d2Str = new Intl.DateTimeFormat('en-US', options).format(d2);
  return d1Str === d2Str;
}

let countdownInterval = null;

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/**
 * Starts a countdown timer to the target ISO datetime string
 * Updates countdownEl every second with remaining time.
 * Applies subtle pop animation on update.
 */
function startCountdown(iso) {
  clearCountdown();
  const target = new Date(iso).getTime();

  function tick() {
    const now = getNow();
    let diff = target - now.getTime();

    if (diff < 0) diff = 0; // never negative

    const ds = Math.floor(diff / 86400000); 
    diff -= ds * 86400000;
    const hs = Math.floor(diff / 3600000); 
    diff -= hs * 3600000;
    const ms = Math.floor(diff / 60000); 
    diff -= ms * 60000;
    const ss = Math.floor(diff / 1000);

    const dayPart = ds > 0 ? `${ds}d ` : '';
    const newText = `${dayPart}${hs}h ${ms}m ${ss}s`;

    if (countdownEl.textContent !== newText) {
      countdownEl.textContent = newText;
      countdownEl.classList.remove('pop');
      void countdownEl.offsetWidth;
      countdownEl.classList.add('pop');
    }
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function main() {
  try {
    const res = await fetch('data/games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load schedule');
    const data = await res.json();

    const now = getNow();

    // Filter upcoming home games after now
    let upcoming = (data.homeGames || []).filter(g => {
      const gameDate = new Date(g.datetime || `${g.date}T00:00:00Z`);
      return gameDate.getTime() >= now.getTime();
    });

    if (!upcoming.length) {
      gameEl.classList.add('hidden');
      futureEl.classList.add('hidden');
      document.body.classList.remove('game-today');
      return;
    }

    const next = upcoming[0];
    const tipISO = next.datetime || `${next.date}T00:00:00Z`;
    const gameDate = new Date(tipISO);

    opponentEl.textContent = `${next.opponent} @ Clippers`;

    if (isSameDayPT(now, gameDate)) {
      datetimeEl.textContent = "TODAY";
      document.body.classList.add('game-today');
      startCountdown(tipISO);
    } else {
      datetimeEl.textContent = fmtDateTime(tipISO);
      document.body.classList.remove('game-today');
      startCountdown(tipISO);
    }

    gameEl.classList.remove('hidden');

    // Exclude next game from future list to avoid duplication
    upcoming = upcoming.slice(1);

    if (upcoming.length) {
      futureEl.classList.remove('hidden');
      futureTitleEl.textContent = `Upcoming Home Games (${upcoming.length})`;
      futureListEl.innerHTML = '';
      
      upcoming.forEach(g => {
        const li = document.createElement('li');
        li.className = 'game-item';
        li.innerHTML = `
          <span class="opponent-name">${g.opponent}</span>
          <span class="game-time">${fmtDateTime(g.datetime || g.date)}</span>
        `;
        futureListEl.appendChild(li);
      });
    } else {
      futureEl.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
    // Show error state but don't clutter with fallback data
    gameEl.classList.add('hidden');
    futureEl.classList.add('hidden');
  }
}

main();