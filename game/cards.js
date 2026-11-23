// TIDEBOUND — card definitions: 4 suits, 36 cards, 5 tide combos.
// Every card: name, suit, tide cost, power. Suits are told apart by
// colour AND shape, never by text alone (Wave ~, Coral ◆, Kelp ❋, Pearl ★).
export const SUITS = {
  wave:  { name: "Wave",  glyph: "∿", color: "#38bdf8", dark: "#0c4a6e", combo: "draw",   comboText: "Draw 1 card" },
  coral: { name: "Coral", glyph: "◆", color: "#fb7185", dark: "#881337", combo: "damage", comboText: "+3 damage" },
  kelp:  { name: "Kelp",  glyph: "❋", color: "#4ade80", dark: "#14532d", combo: "heal",   comboText: "Heal 3 harbour" },
  pearl: { name: "Pearl", glyph: "★", color: "#fbbf24", dark: "#78350f", combo: "shield", comboText: "+3 shield" },
};

// [name, suit, cost, power] — 9 cards per suit, 36 in the deck.
const CARD_ROWS = [
  ["Ripple", "wave", 1, 2], ["Foam", "wave", 1, 1], ["Drizzle", "wave", 1, 2],
  ["Breaker", "wave", 2, 4], ["Swell", "wave", 2, 3], ["Undertow", "wave", 3, 5],
  ["Riptide", "wave", 4, 7], ["Monsoon", "wave", 4, 8], ["Tsunami", "wave", 5, 9],
  ["Spike", "coral", 1, 3], ["Sting", "coral", 1, 2], ["Thorn", "coral", 2, 3],
  ["Reef", "coral", 2, 4], ["Shard", "coral", 2, 4], ["Bloom", "coral", 3, 6],
  ["Blood Coral", "coral", 3, 5], ["Anemone", "coral", 3, 5], ["Crown", "coral", 4, 8],
  ["Frond", "kelp", 1, 2], ["Sprout", "kelp", 1, 1], ["Tangle", "kelp", 2, 3],
  ["Holdfast", "kelp", 2, 4], ["Vine", "kelp", 2, 4], ["Meadow", "kelp", 3, 4],
  ["Root", "kelp", 3, 5], ["Canopy", "kelp", 3, 6], ["Grove", "kelp", 4, 7],
  ["Gleam", "pearl", 1, 2], ["Dew", "pearl", 1, 1], ["Lustre", "pearl", 2, 4],
  ["Nacre", "pearl", 2, 3], ["Halo", "pearl", 2, 4], ["Gilt", "pearl", 3, 5],
  ["Opal", "pearl", 3, 6], ["Moonpearl", "pearl", 4, 8], ["Tithe", "pearl", 4, 7],
];

export const CARDS = CARD_ROWS.map(([name, suit, cost, power], i) => ({
  id: `card-${i + 1}`, name, suit, cost, power,
}));

export function buildDeck() {
  return CARDS.map((c) => ({ ...c, uid: `${c.id}-${Math.random().toString(36).slice(2, 7)}` }));
}

export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// A tide combo fires when 2+ cards of one suit are played in a turn.
export function tideCombos(played) {
  const counts = {};
  for (const c of played) counts[c.suit] = (counts[c.suit] || 0) + 1;
  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .map(([suit]) => suit);
}
