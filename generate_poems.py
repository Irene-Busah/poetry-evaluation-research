#!/usr/bin/env python3
"""Parse the 3 poem CSV files and generate poems.js"""
import csv, json, re, os

DATA_DIR = "/Users/irenebusah/Desktop/research"
OUT = os.path.join(DATA_DIR, "poems.js")

THEMES = ["Longing", "Grief", "Hope"]
FILES = {
    "Longing": os.path.join(DATA_DIR, "Poem Data - Longing.csv"),
    "Grief":   os.path.join(DATA_DIR, "Poem Data - Grief.csv"),
    "Hope":    os.path.join(DATA_DIR, "Poem Data - Hope.csv"),
}

CONDITION_MAP = {
    "Baseline": "Baseline",
    "Guideline": "Guideline",
    "Context + Persona Prompt": "Persona",
}

poems = {}

for theme_key, filepath in FILES.items():
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_id = (row.get("ID") or "").strip()
            if not raw_id or not raw_id.isdigit():
                continue
            csv_id = int(raw_id)
            condition_raw = (row.get("Condition") or "").strip()
            condition = CONDITION_MAP.get(condition_raw, condition_raw)
            text = (row.get("Poem Text") or "").strip()
            # Remove emoji characters
            text = re.sub(r'[\U0001F300-\U0001F9FF\u2728\u2600-\u26FF\u2700-\u27BF]', '', text).strip()

            # Compute poem index (1-5) within its condition group
            if csv_id <= 5:
                idx = csv_id
            elif csv_id <= 10:
                idx = csv_id - 5
            else:
                idx = csv_id - 10

            poem_id = f"{theme_key}-{condition}-{idx}"
            poems[poem_id] = {
                "id": poem_id,
                "theme": theme_key,
                "condition": condition,
                "index": idx,
                "text": text,
            }

# Generate comparison pool
comparisons = []
comp_types = [
    ("Baseline", "Guideline"),
    ("Baseline", "Persona"),
    ("Guideline", "Persona"),
]

comp_id = 0
for theme in THEMES:
    for cond_a, cond_b in comp_types:
        for idx in range(1, 6):
            comp_id += 1
            a_id = f"{theme}-{cond_a}-{idx}"
            b_id = f"{theme}-{cond_b}-{idx}"
            comparisons.append({
                "id": f"comp-{comp_id:02d}",
                "theme": theme,
                "comparisonType": f"{cond_a}-vs-{cond_b}",
                "poemA_id": a_id,
                "poemB_id": b_id,
            })

print(f"Total poems: {len(poems)}")
print(f"Total comparisons: {len(comparisons)}")

# Verify all comparison poem IDs exist
for c in comparisons:
    assert c["poemA_id"] in poems, f"Missing: {c['poemA_id']}"
    assert c["poemB_id"] in poems, f"Missing: {c['poemB_id']}"

# Write poems.js
with open(OUT, "w", encoding="utf-8") as f:
    f.write("/**\n")
    f.write(" * poems.js\n")
    f.write(" * Real poem data for the Poetry Evaluation Study.\n")
    f.write(" * Auto-generated from CSV files. Do not edit manually.\n")
    f.write(" *\n")
    f.write(" * 45 poems: 3 themes × 3 conditions × 5 poems each\n")
    f.write(" * 45 pairwise comparisons: 3 themes × 3 comparison types × 5 indices\n")
    f.write(" */\n\n")

    # Write POEMS object
    f.write("const POEMS = {\n")
    for pid, p in poems.items():
        escaped = p["text"].replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
        f.write(f'  "{pid}": {{\n')
        f.write(f'    id: "{pid}",\n')
        f.write(f'    theme: "{p["theme"]}",\n')
        f.write(f'    condition: "{p["condition"]}",\n')
        f.write(f'    index: {p["index"]},\n')
        f.write(f'    text: `{escaped}`,\n')
        f.write(f'  }},\n')
    f.write("};\n\n")

    # Write COMPARISON_POOL
    f.write("const COMPARISON_POOL = [\n")
    for c in comparisons:
        f.write(f'  {{ id: "{c["id"]}", theme: "{c["theme"]}", comparisonType: "{c["comparisonType"]}", poemA_id: "{c["poemA_id"]}", poemB_id: "{c["poemB_id"]}" }},\n')
    f.write("];\n\n")

    # Write assignComparisons function
    f.write("""/**
 * Select `n` comparisons from the pool, balanced across themes.
 * Default: 9 comparisons (3 per theme).
 */
function assignComparisons(n = 9) {
  const perTheme = Math.floor(n / 3);
  const themes = ["Longing", "Grief", "Hope"];

  // Group by theme
  const byTheme = {};
  themes.forEach(t => {
    byTheme[t] = COMPARISON_POOL.filter(c => c.theme === t);
  });

  // Shuffle helper
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pick `perTheme` from each theme
  const selected = [];
  themes.forEach(t => {
    const shuffled = shuffle(byTheme[t]);
    selected.push(...shuffled.slice(0, perTheme));
  });

  // If n is not divisible by 3, fill remaining from any theme
  const remaining = n - selected.length;
  if (remaining > 0) {
    const usedIds = new Set(selected.map(c => c.id));
    const leftover = shuffle(COMPARISON_POOL.filter(c => !usedIds.has(c.id)));
    selected.push(...leftover.slice(0, remaining));
  }

  return shuffle(selected);
}
""")

print(f"Written to {OUT}")
