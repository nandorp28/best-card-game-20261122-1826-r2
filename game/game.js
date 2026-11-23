// TIDEBOUND — duel of moon tides. You are the tide-caller; Rin holds the
// far harbour. Play cards to the table, chain 2+ of one suit to fire its
// tide combo, and sink her harbour (20 life) before she sinks yours.
// State machine: title -> play -> win | loss. ?shot=title|play|win|loss
// renders a fixed state for screenshots (the game itself, same code path).
import { SUITS, CARDS, buildDeck, shuffle, tideCombos } from "./cards.js";
import { telegraphIntent, choosePlays } from "./ai.js";
import { sfx, setMuted } from "./sound.js";

const MAX_HP = 20;
const HAND_MAX = 7;
const $ = (s) => document.querySelector(s);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const state = {
  screen: "title", turn: 0, energy: 0, energyMax: 3,
  playerHP: MAX_HP, oppHP: MAX_HP, playerShield: 0, oppShield: 0,
  playerHand: [], oppHand: [], deck: [], playedPlayer: [], playedOpp: [],
  resolving: false, muted: false, seed: 7,
  stats: { damage: 0, combos: 0, played: 0 },
  intent: null, log: "The moon is full. The tide is listening.",
};

function cardEl(card, opts = {}) {
  const suit = SUITS[card.suit];
  const el = document.createElement("div");
  el.className = `card suit-${card.suit}${opts.played ? " played" : ""}${opts.small ? " small" : ""}`;
  el.dataset.uid = card.uid;
  el.style.setProperty("--suit", suit.color);
  el.style.setProperty("--suit-dark", suit.dark);
  el.innerHTML =
    `<div class="cost">${"●".repeat(card.cost)}<span>${card.cost}</span></div>` +
    `<div class="glyph">${suit.glyph}</div>` +
    `<div class="cname">${card.name}</div>` +
    `<div class="suitname">${suit.name}</div>` +
    `<div class="power">${card.power}</div>`;
  if (!opts.played && !opts.small) {
    el.addEventListener("click", () => playCard(card.uid));
  }
  return el;
}

function backEl() {
  const el = document.createElement("div");
  el.className = "card back";
  el.innerHTML = `<div class="back-glyph">∿</div><div class="back-word">TIDE</div>`;
  return el;
}

function hpBar(hp, shield) {
  const pct = Math.max(0, (hp / MAX_HP) * 100);
  return `<div class="hpbar"><div class="hpfill" style="width:${pct}%"></div>` +
    `<span class="hptext">${hp} ♥${shield ? ` · 🛡 ${shield}` : ""}</span></div>`;
}

function render() {
  const s = state;
  $("#opp-hp").innerHTML = hpBar(s.oppHP, s.oppShield);
  $("#you-hp").innerHTML = hpBar(s.playerHP, s.playerShield);
  $("#turn-label").textContent = `Turn ${Math.max(1, s.turn)}`;
  $("#energy").innerHTML = `Tide ${"●".repeat(s.energy)}${"○".repeat(Math.max(0, s.energyMax - s.energy))} <span>${s.energy}/${s.energyMax}</span>`;
  $("#score-line").textContent =
    `Damage ${s.stats.damage} · Combos ${s.stats.combos} · Cards ${s.stats.played} · Deck ${s.deck.length}`;
  $("#log").textContent = s.log;

  const oppHand = $("#opp-hand");
  oppHand.innerHTML = "";
  s.oppHand.forEach(() => oppHand.appendChild(backEl()));

  const tableOpp = $("#table-opp");
  tableOpp.innerHTML = "";
  s.playedOpp.forEach((c) => tableOpp.appendChild(cardEl(c, { played: true, small: true })));

  const tableYou = $("#table-you");
  tableYou.innerHTML = "";
  s.playedPlayer.forEach((c) => tableYou.appendChild(cardEl(c, { played: true, small: true })));

  const hand = $("#hand");
  hand.innerHTML = "";
  s.playerHand.forEach((c, i) => {
    const el = cardEl(c);
    el.style.setProperty("--i", i - (s.playerHand.length - 1) / 2);
    if (c.cost > s.energy || s.resolving) el.classList.add("unaffordable");
    hand.appendChild(el);
  });

  const combos = tideCombos(s.playedPlayer);
  const meter = $("#combo-meter");
  if (combos.length) {
    meter.innerHTML = combos.map((suit) =>
      `<span class="combo-badge suit-${suit}">${SUITS[suit].glyph} ${SUITS[suit].name.toUpperCase()} TIDE ×2 — ${SUITS[suit].comboText}</span>`
    ).join("");
  } else {
    const counts = {};
    s.playedPlayer.forEach((c) => (counts[c.suit] = (counts[c.suit] || 0) + 1));
    const near = Object.entries(counts).filter(([, n]) => n === 1).map(([suit]) => suit);
    meter.innerHTML = near.length
      ? `<span class="combo-hint">One more ${near.map((x) => SUITS[x].name).join(" or ")} card fires a tide combo</span>`
      : `<span class="combo-hint">Play 2 of one suit in a turn to fire its tide combo</span>`;
  }

  const intent = $("#intent");
  intent.innerHTML = s.intent
    ? `<span class="intent-eye">◉</span> ${s.intent.text}`
    : `<span class="intent-eye">◉</span> Rin is watching the water…`;

  document.body.dataset.screen = s.screen;
  $("#screen-title").classList.toggle("hidden", s.screen !== "title");
  $("#screen-win").classList.toggle("hidden", s.screen !== "win");
  $("#screen-loss").classList.toggle("hidden", s.screen !== "loss");
  $("#end-turn").disabled = s.resolving || s.screen !== "play";
}

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (state.playerHand.length >= HAND_MAX) break;
    if (!state.deck.length) state.deck = shuffle(buildDeck());
    state.playerHand.push(state.deck.pop());
  }
}

function startGame() {
  const rng = mulberry32(state.seed);
  const deck = shuffle(buildDeck());
  void rng;
  state.deck = deck;
  state.playerHand = []; state.oppHand = [];
  for (let i = 0; i < 7; i++) {
    state.playerHand.push(state.deck.pop());
    state.oppHand.push(state.deck.pop());
  }
  state.playerHP = MAX_HP; state.oppHP = MAX_HP;
  state.playerShield = 0; state.oppShield = 0;
  state.playedPlayer = []; state.playedOpp = [];
  state.stats = { damage: 0, combos: 0, played: 0 };
  state.turn = 1; state.energyMax = 3; state.energy = 3;
  state.screen = "play"; state.resolving = false;
  state.intent = telegraphIntent(state.oppHand);
  state.log = "Your turn — play cards, then end the turn.";
  sfx.draw();
  render();
}

function playCard(uid) {
  if (state.screen !== "play" || state.resolving) return;
  const idx = state.playerHand.findIndex((c) => c.uid === uid);
  if (idx < 0) return;
  const card = state.playerHand[idx];
  if (card.cost > state.energy) {
    state.log = `Not enough tide — ${card.name} costs ${card.cost}.`;
    render();
    return;
  }
  state.energy -= card.cost;
  state.playerHand.splice(idx, 1);
  state.playedPlayer.push(card);
  state.stats.played++;
  state.log = `You play ${card.name} (${SUITS[card.suit].name} ${card.power}).`;
  sfx.play();
  render();
}

function applyCombos(played, self) {
  const fired = tideCombos(played);
  let bonusDamage = 0;
  for (const suit of fired) {
    const combo = SUITS[suit].combo;
    state.stats.combos++;
    if (combo === "draw" && self === "player") { drawCards(1); state.log += ` ${SUITS[suit].name} tide draws a card.`; }
    if (combo === "damage") { bonusDamage += 3; state.log += ` ${SUITS[suit].name} tide +3 damage.`; }
    if (combo === "heal") {
      if (self === "player") state.playerHP = Math.min(MAX_HP, state.playerHP + 3);
      else state.oppHP = Math.min(MAX_HP, state.oppHP + 3);
      state.log += ` ${SUITS[suit].name} tide heals 3.`;
    }
    if (combo === "shield") {
      if (self === "player") state.playerShield += 3;
      else state.oppShield += 3;
      state.log += ` ${SUITS[suit].name} tide +3 shield.`;
    }
  }
  if (fired.length) sfx.combo();
  return bonusDamage;
}

function dealDamage(power, from, to) {
  let shield = to === "opp" ? state.oppShield : state.playerShield;
  let hp = to === "opp" ? state.oppHP : state.playerHP;
  const blocked = Math.min(shield, power);
  const dealt = power - blocked;
  if (to === "opp") { state.oppShield -= blocked; state.oppHP = Math.max(0, hp - dealt); }
  else { state.playerShield -= blocked; state.playerHP = Math.max(0, hp - dealt); }
  if (from === "player") state.stats.damage += dealt;
  return { blocked, dealt };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endTurn() {
  if (state.screen !== "play" || state.resolving) return;
  state.resolving = true;
  render();

  // Your tide resolves first.
  const yourPower = state.playedPlayer.reduce((s, c) => s + c.power, 0);
  const yourBonus = applyCombos(state.playedPlayer, "player");
  if (yourPower + yourBonus > 0) {
    const r = dealDamage(yourPower + yourBonus, "player", "opp");
    state.log = `Your tide crashes for ${yourPower + yourBonus} (${r.blocked} blocked, ${r.dealt} through).`;
    sfx.hit();
    render();
    await sleep(650);
  }
  state.playedPlayer = [];
  if (state.oppHP <= 0) return finish(true);

  // Rin's turn: she plays face-up, one card at a time.
  const plays = choosePlays(state.oppHand, state.energyMax);
  for (const card of plays) {
    const i = state.oppHand.findIndex((c) => c.uid === card.uid);
    if (i >= 0) state.oppHand.splice(i, 1);
    state.playedOpp.push(card);
    state.log = `Rin plays ${card.name} (${SUITS[card.suit].name} ${card.power}).`;
    sfx.play();
    render();
    await sleep(550);
  }
  const oppPower = state.playedOpp.reduce((s, c) => s + c.power, 0);
  const oppBonus = applyCombos(state.playedOpp, "opp");
  if (oppPower + oppBonus > 0) {
    const r = dealDamage(oppPower + oppBonus, "opp", "player");
    state.log = `Rin's tide crashes for ${oppPower + oppBonus} (${r.blocked} blocked, ${r.dealt} through).`;
    sfx.hit();
    render();
    await sleep(650);
  }
  state.playedOpp = [];
  if (state.playerHP <= 0) return finish(false);

  // Next turn: fresh tide, fresh cards, fresh intent.
  state.turn++;
  state.energyMax = Math.min(6, 3 + state.turn - 1);
  state.energy = state.energyMax;
  drawCards(2);
  const refill = [];
  while (state.oppHand.length < 7 && state.deck.length) refill.push(state.deck.pop());
  state.oppHand.push(...refill);
  state.intent = telegraphIntent(state.oppHand);
  state.log = `Turn ${state.turn} — ${state.intent ? state.intent.text : "Rin is watching."} Your tide refills to ${state.energyMax}.`;
  state.resolving = false;
  sfx.draw();
  render();
}

function finish(won) {
  state.screen = won ? "win" : "loss";
  state.resolving = false;
  if (won) {
    $("#win-stats").textContent =
      `Won in ${state.turn} turns · ${state.stats.damage} damage dealt · ${state.stats.combos} tide combos · ${state.stats.played} cards played`;
    sfx.win();
  } else {
    $("#loss-stats").textContent =
      `Fell in ${state.turn} turns · ${state.stats.damage} damage dealt · ${state.stats.combos} tide combos · Rin's harbour stands at ${state.oppHP}`;
    sfx.loss();
  }
  render();
}

// Fixed screenshot states: same code path as play, deterministic hands.
function seedShot(kind) {
  const deck = buildDeck();
  const pick = (...ids) => ids.map((id) => ({ ...CARDS.find((c) => c.id === id), uid: `${id}-shot` }));
  const wave = pick("card-4", "card-7", "card-1");
  if (kind === "play") {
    state.screen = "play"; state.turn = 4; state.energyMax = 6; state.energy = 4;
    state.playerHP = 14; state.oppHP = 9; state.playerShield = 3; state.oppShield = 0;
    state.deck = deck.slice(0, 12);
    state.playerHand = pick("card-2", "card-11", "card-19", "card-28", "card-5", "card-14", "card-33");
    state.oppHand = [{}, {}, {}, {}, {}];
    state.playedPlayer = pick("card-1", "card-4");
    state.playedOpp = pick("card-10", "card-20");
    state.stats = { damage: 11, combos: 2, played: 9 };
    state.intent = { suit: "coral", count: 2, text: "Rin gathers Coral — 2 in hand" };
    state.log = "Wave tide ×2 — draw 1 card. Your move: one more Coral fires +3 damage.";
    void wave;
  } else if (kind === "win") {
    state.screen = "win"; state.turn = 6; state.energyMax = 6; state.energy = 2;
    state.playerHP = 8; state.oppHP = 0; state.playerShield = 0; state.oppShield = 0;
    state.deck = deck.slice(0, 8);
    state.playerHand = pick("card-3", "card-12", "card-30");
    state.oppHand = [{}, {}];
    state.playedPlayer = pick("card-9", "card-18");
    state.playedOpp = pick("card-22");
    state.stats = { damage: 24, combos: 4, played: 15 };
    state.intent = null;
    state.log = "The last wave breaks over Rin's harbour.";
    $("#win-stats").textContent = "Won in 6 turns · 24 damage dealt · 4 tide combos · 15 cards played";
  } else if (kind === "loss") {
    state.screen = "loss"; state.turn = 7; state.energyMax = 6; state.energy = 1;
    state.playerHP = 0; state.oppHP = 11; state.playerShield = 0; state.oppShield = 3;
    state.deck = deck.slice(0, 6);
    state.playerHand = pick("card-6", "card-25");
    state.oppHand = [{}, {}, {}];
    state.playedPlayer = pick("card-15");
    state.playedOpp = pick("card-8", "card-17", "card-27");
    state.stats = { damage: 13, combos: 1, played: 11 };
    state.intent = null;
    state.log = "Rin's tide takes your harbour.";
    $("#loss-stats").textContent = "Fell in 7 turns · 13 damage dealt · 1 tide combo · Rin's harbour stands at 11";
  }
  render();
}

function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  const seed = parseInt(params.get("seed") || "7", 10);
  state.seed = Number.isFinite(seed) ? seed : 7;
  if (shot) document.documentElement.classList.add("shot");
  $("#end-turn").addEventListener("click", endTurn);
  $("#play-btn").addEventListener("click", () => { sfx.click(); startGame(); });
  $("#again-win").addEventListener("click", () => { sfx.click(); startGame(); });
  $("#again-loss").addEventListener("click", () => { sfx.click(); startGame(); });
  $("#mute-btn").addEventListener("click", (e) => {
    state.muted = !state.muted;
    setMuted(state.muted);
    e.target.textContent = state.muted ? "🔇 Sound off" : "🔊 Sound on";
  });
  document.addEventListener("keydown", (e) => {
    if (state.screen !== "play" || state.resolving) return;
    if (e.key >= "1" && e.key <= "7") {
      const card = state.playerHand[parseInt(e.key, 10) - 1];
      if (card) playCard(card.uid);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      endTurn();
    }
  });
  if (shot === "play" || shot === "win" || shot === "loss") seedShot(shot);
  render();
}

boot();
