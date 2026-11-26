"""Rebuild the offline, single-file review from the actual walking prototype."""
from pathlib import Path

review = Path(__file__).resolve().parent
root = review.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "town.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="town.css">', f"<style>{css}</style>")
for name in ("debug.js", "vendor/three.min.js", "neighborhood.js", "town.js", "walk.js"):
    script = (root / name).read_text(encoding="utf-8")
    html = html.replace(f'<script src="{name}"></script>', f"<script>{script}</script>")
license_text = (root / "vendor/three-LICENSE.txt").read_text(encoding="utf-8")
(review / "walk.html").write_text(
    html.replace("</body>", f"<!-- Three.js license\n{license_text}\n-->\n</body>"),
    encoding="utf-8",
)
