#!/usr/bin/env python3
"""Build extra_questions.json from stem TSVs, banks_domain_compact, and d2_extra_tuples.

D1: stems_d1.tsv (tab: question, correct choice, explanation).
D2: stems_d2_partial.tsv plus d2_extra_tuples.D2_EXTRA.
D3–D8: tuple banks in banks_domain_compact.py.
Then run merge_questions.py to emit ../js/questions.js.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from banks_domain_compact import D3, D4, D5, D6, D7, D8
from d2_extra_tuples import D2_EXTRA

DIR = Path(__file__).resolve().parent

# Extra questions per domain (merged later with 10 base items each). Totals align with
# merge_questions.py allocate_by_weight(..., TOTAL_BANK_QUESTIONS=719): d1=115 → 105 extra.
EXTRA_COUNTS = {
    "d1": 105,
    "d2": 62,
    "d3": 83,
    "d4": 83,
    "d5": 84,
    "d6": 76,
    "d7": 84,
    "d8": 62,
}


def finalize(rows: list[tuple[str, str, str]], seed: int) -> list[dict]:
    cors = [r[1] for r in rows]
    out: list[dict] = []
    for i, (q, cor, expl) in enumerate(rows):
        wrongs = [c for c in cors if c != cor]
        random.seed(seed + i * 17 + (len(cor) % 99))
        random.shuffle(wrongs)
        out.append(
            {
                "q": q,
                "choices": [cor, wrongs[0], wrongs[1], wrongs[2]],
                "correct": 0,
                "explain": expl,
            }
        )
    return out


def load_tsv(path: Path) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            raise ValueError(f"Bad line in {path}: {line!r}")
        rows.append((parts[0], parts[1], parts[2]))
    return rows


def main() -> None:
    d1 = load_tsv(DIR / "stems_d1.tsv")
    d2 = load_tsv(DIR / "stems_d2_partial.tsv") + D2_EXTRA
    banks_raw = {
        "d1": d1,
        "d2": d2,
        "d3": D3,
        "d4": D4,
        "d5": D5,
        "d6": D6,
        "d7": D7,
        "d8": D8,
    }
    seeds = {"d1": 11, "d2": 22, "d3": 33, "d4": 44, "d5": 55, "d6": 66, "d7": 77, "d8": 88}

    extra: dict[str, list] = {}
    for k, raw in banks_raw.items():
        need = EXTRA_COUNTS[k]
        if len(raw) < need:
            raise SystemExit(f"{k}: need at least {need} stem rows, have {len(raw)}")
        rows = raw[:need]
        extra[k] = finalize(rows, seeds[k])

    out = DIR / "extra_questions.json"
    out.write_text(json.dumps(extra, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    n = sum(len(v) for v in extra.values())
    print(f"Wrote {out} ({n} extra questions)")


if __name__ == "__main__":
    main()
