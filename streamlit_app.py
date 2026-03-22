#!/usr/bin/env python3
"""
Run the CISSP quiz inside Streamlit via an HTML iframe (components.html).

Deploy: Streamlit Community Cloud, or any host that runs `streamlit run streamlit_app.py`.

Note: This app is static HTML/JS; for production, static hosting (GitHub Pages, Netlify,
S3+CloudFront) is simpler and faster. Use Streamlit only if you need it in a Python stack.

Caveat: Adding other Streamlit widgets (sidebar, buttons) causes reruns and remounts the
quiz iframe — in-progress sessions reset. Keep this page to the embedded quiz only.
"""
from __future__ import annotations

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent


def build_embedded_index_html() -> str:
    """Inline CSS and JS so the iframe does not need separate asset URLs."""
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    questions_js = (ROOT / "js" / "questions.js").read_text(encoding="utf-8")
    app_js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

    index = index.replace(
        '<link rel="stylesheet" href="styles.css" />',
        f"<style>\n{css}\n</style>",
    )
    index = index.replace(
        '<script src="js/questions.js"></script>',
        f"<script>\n{questions_js}\n</script>",
    )
    index = index.replace(
        '<script src="js/app.js"></script>',
        f"<script>\n{app_js}\n</script>",
    )
    return index


def main() -> None:
    st.set_page_config(
        page_title="CISSP Domain Quizzes",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    html = build_embedded_index_html()
    # Tall iframe; quiz scrolls inside. Increase if needed on large displays.
    components.html(html, height=1200, scrolling=True)


if __name__ == "__main__":
    main()
