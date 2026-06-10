#!/usr/bin/env python3
"""Mirror index.html to the results-site artifact path with images inlined
as base64 data URIs, so the artifact is a single self-contained file.

Run from the solution directory: python3 scout/build_artifact.py
"""

import base64
import os
import re

SOLUTION = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(SOLUTION))
ARTIFACT = os.path.join(REPO, "public", "artifacts", "surf-lodge-scout",
                        "cursor-fable-5-thinking-high.html")

with open(os.path.join(SOLUTION, "index.html")) as f:
    html = f.read()


def inline(match):
    rel = match.group(1)
    path = os.path.join(SOLUTION, rel)
    with open(path, "rb") as img:
        b64 = base64.b64encode(img.read()).decode()
    return f'src="data:image/jpeg;base64,{b64}"'


html = re.sub(r'src="(img/[^"]+)"', inline, html)
os.makedirs(os.path.dirname(ARTIFACT), exist_ok=True)
with open(ARTIFACT, "w") as f:
    f.write(html)
print(f"wrote {ARTIFACT} ({os.path.getsize(ARTIFACT)//1024} KB)")
