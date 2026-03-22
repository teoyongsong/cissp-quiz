#!/usr/bin/env python3
"""Merge base + extra, trim per official CISSP exam domain weights, emit ../js/questions.js"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Official CISSP domain weights (English exam), effective April 15, 2024 — (ISC)² JTA.
# Source: CISSP Detailed Content Outline / exam blueprint.
EXAM_WEIGHTS: dict[str, int] = {
    "d1": 16,
    "d2": 10,
    "d3": 13,
    "d4": 13,
    "d5": 13,
    "d6": 12,
    "d7": 13,
    "d8": 10,
}

# Total items across all domains after weighting. Set so domain 1 reaches 115 items at 16%
# (115 / 0.16 ≈ 718.75 → 719 with largest-remainder).
TOTAL_BANK_QUESTIONS = 719


def allocate_by_weight(weights: dict[str, int], total: int) -> dict[str, int]:
    """Largest-remainder method; weights are integer percents summing to 100."""
    if sum(weights.values()) != 100:
        raise ValueError("weights must sum to 100")
    raw = {k: total * weights[k] / 100.0 for k in weights}
    out = {k: int(raw[k]) for k in weights}
    remainder = total - sum(out.values())
    order = sorted(weights.keys(), key=lambda k: (raw[k] - out[k], k), reverse=True)
    for i in range(remainder):
        out[order[i]] += 1
    return out


def build_header() -> str:
    meta = [
        (
            "d1",
            1,
            "Security and Risk Management",
            "Governance, risk, compliance, policies, and business continuity.",
            16,
        ),
        (
            "d2",
            2,
            "Asset Security",
            "Classification, handling, retention, and privacy of information assets.",
            10,
        ),
        (
            "d3",
            3,
            "Security Architecture and Engineering",
            "Secure design, cryptography, and security models.",
            13,
        ),
        (
            "d4",
            4,
            "Communication and Network Security",
            "Network design, protocols, segmentation, and secure communications.",
            13,
        ),
        (
            "d5",
            5,
            "Identity and Access Management",
            "Identification, authentication, authorization, and accountability.",
            13,
        ),
        (
            "d6",
            6,
            "Security Assessment and Testing",
            "Vulnerability management, testing, and audits.",
            12,
        ),
        (
            "d7",
            7,
            "Security Operations",
            "Monitoring, IR, logging, and operational resilience.",
            13,
        ),
        (
            "d8",
            8,
            "Software Development Security",
            "SDLC, secure coding, and application security.",
            10,
        ),
    ]
    lines = [
        "/**",
        " * CISSP CBK — eight domains. Multiple-choice practice (educational use).",
        " * Correct answers index: 0-based in `correct` field (choices shuffled at runtime).",
        f" * Bank sized to ~{TOTAL_BANK_QUESTIONS} items using official 2024 exam domain weights (largest-remainder).",
        " */",
        "const CISSP_DOMAINS = [",
    ]
    for did, num, title, blurb, wt in meta:
        lines.append("  {")
        lines.append(f'    id: "{did}",')
        lines.append(f"    num: {num},")
        lines.append(f'    title: "{title}",')
        lines.append(f'    blurb: "{blurb}",')
        lines.append(f"    examWeight: {wt},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append(f"const CISSP_WEIGHTED_BANK_TOTAL = {TOTAL_BANK_QUESTIONS};")
    lines.append("")
    return "\n".join(lines)


HEADER = build_header()


def js_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def question_to_js(obj: dict, indent: str = "    ") -> str:
    lines = [f"{indent}{{"]
    lines.append(f'{indent}  q: "{js_escape(obj["q"])}",')
    lines.append(f"{indent}  choices: [")
    for c in obj["choices"]:
        lines.append(f'{indent}    "{js_escape(c)}",')
    lines.append(f"{indent}  ],")
    lines.append(f"{indent}  correct: {obj['correct']},")
    exp = obj["explain"]
    if "\n" in exp or len(exp) > 70:
        lines.append(f"{indent}  explain:")
        lines.append(f'{indent}    "{js_escape(exp)}",')
    else:
        lines.append(f'{indent}  explain: "{js_escape(exp)}",')
    lines.append(f"{indent}}}")
    return "\n".join(lines)


def emit_questions(merged: dict[str, list]) -> str:
    blocks = ["const QUESTIONS = {"]
    for key in sorted(merged.keys()):
        arr = merged[key]
        blocks.append(f"  {key}: [")
        parts = []
        for item in arr:
            parts.append(question_to_js(item, "    "))
        blocks.append(",\n".join(parts))
        blocks.append("  ],")
    blocks.append("};")
    return "\n".join(blocks)


def main() -> None:
    targets = allocate_by_weight(EXAM_WEIGHTS, TOTAL_BANK_QUESTIONS)
    base_path = Path(__file__).parent / "base_questions.json"
    extra_path = Path(__file__).parent / "extra_questions.json"
    base = json.loads(base_path.read_text(encoding="utf-8"))
    extra = json.loads(extra_path.read_text(encoding="utf-8"))
    merged: dict[str, list] = {}
    for k in base:
        full = base[k] + extra[k]
        want = targets[k]
        if len(full) < want:
            raise SystemExit(f"{k}: need at least {want} questions, have {len(full)}")
        merged[k] = full[:want]

    total_out = sum(len(merged[k]) for k in merged)
    if total_out != TOTAL_BANK_QUESTIONS:
        raise SystemExit(f"internal: total {total_out} != {TOTAL_BANK_QUESTIONS}")

    out = HEADER + "\n" + emit_questions(merged) + "\n"
    out_path = ROOT / "js" / "questions.js"
    out_path.write_text(out, encoding="utf-8")
    print(f"Wrote {out_path} ({total_out} total questions)")
    for k in sorted(merged.keys()):
        print(f"  {k}: {len(merged[k])} (target {targets[k]}, weight {EXAM_WEIGHTS[k]}%)")


if __name__ == "__main__":
    main()
