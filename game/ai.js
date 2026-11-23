// TIDEBOUND — Rin, the tide-caller opponent. Her choices are readable:
// she announces the suit she is gathering before you end your turn, and
// she plays the highest-value cards she can afford, preferring to finish
// a suit pair so a tide combo fires.
import { SUITS } from "./cards.js";

export function telegraphIntent(hand) {
  if (!hand.length) return null;
  const counts = {};
  for (const c of hand) counts[c.suit] = (counts[c.suit] || 0) + 1;
  let best = null, bestCount = 0;
  for (const [suit, n] of Object.entries(counts)) {
    if (n > bestCount) { best = suit; bestCount = n; }
  }
  return { suit: best, count: bestCount, text: `Rin gathers ${SUITS[best].name} — ${bestCount} in hand` };
}

function valueOf(card) {
  return card.power / Math.max(1, card.cost);
}

export function choosePlays(hand, energy) {
  // Greedy by value, but complete a suit pair first when one card away.
  const plays = [];
  let left = energy;
  const pool = [...hand].sort((a, b) => valueOf(b) - valueOf(a));
  const playedSuits = {};
  for (const card of pool) {
    if (card.cost > left) continue;
    const pairBonus = playedSuits[card.suit] ? 0.6 : 0;
    const alonePenalty = pool.some(
      (o) => o !== card && o.suit === card.suit && o.cost <= left - card.cost
    ) ? 0 : 0;
    void pairBonus; void alonePenalty;
    plays.push(card);
    playedSuits[card.suit] = (playedSuits[card.suit] || 0) + 1;
    left -= card.cost;
    if (plays.length >= 3) break;
  }
  // Second pass: if a played suit has a partner we can still afford, swap
  // the weakest single-suit play for it so the combo fires.
  const singles = plays.filter((c) => playedSuits[c.suit] === 1);
  if (singles.length && plays.length < 3) {
    const weak = singles.sort((a, b) => valueOf(a) - valueOf(b))[0];
    const spent = plays.reduce((s, c) => s + c.cost, 0);
    const partner = pool.find(
      (o) => !plays.includes(o) && playedSuits[o.suit] && o.cost <= energy - spent + weak.cost
    );
    if (partner) {
      plays.splice(plays.indexOf(weak), 1, partner);
    }
  }
  return plays;
}
