// TIDEBOUND — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's library, exactly as the scorer rebuilds it. Runs twice and must
// write the same bytes both times, so it is fully deterministic.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = new URL(".", import.meta.url).pathname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ["game", "screenshots"]) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in repository`);
  cpSync(src, join(outDir, name), { recursive: true });
}

// The dossier is built from the copied files, never from the repository
// directly, so the bytes it records are exactly the bytes handed in.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

console.log(`TIDEBOUND handed in: game/ + screenshots/ + dossier.json (${dossier.length} bytes) -> ${outDir}`);
