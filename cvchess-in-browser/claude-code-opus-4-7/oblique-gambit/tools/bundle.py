"""Bundle oblique-gambit into a single HTML file.

Produces a self-contained HTML artifact with CSS/JS inlined and dataset
images encoded as data URIs, so it works when opened from anywhere on disk
(including /docs/artifacts/cvchess-in-browser/ on GitHub Pages).
"""

import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel: str) -> str:
    return (ROOT / rel).read_text()


def data_uri(rel: str, mime: str) -> str:
    b = (ROOT / rel).read_bytes()
    return f"data:{mime};base64,{base64.b64encode(b).decode('ascii')}"


def main(out_path: str) -> None:
    css = read("app.css")
    pipeline_js = read("pipeline.js")
    app_js = read("app.js")
    dataset = json.loads(read("dataset.json"))

    for img in dataset["images"]:
        rel = img["file"]
        img["file"] = data_uri(rel, "image/jpeg")

    try:
        precomp = json.loads(read("precomputed/results.json"))
    except FileNotFoundError:
        precomp = None

    html = read("index.html")

    # Inline the CSS stylesheet
    html = html.replace(
        '<link rel="stylesheet" href="app.css">',
        f"<style>\n{css}\n</style>",
    )

    # Inline pipeline.js and app.js, preceded by fetch shim that intercepts
    # dataset.json / precomputed/results.json lookups with inlined JSON.
    dataset_json = json.dumps(dataset)
    precomp_json = json.dumps(precomp) if precomp is not None else "null"
    shim = f"""
<script>
(function () {{
  const DATASET = {dataset_json};
  const PRECOMP = {precomp_json};
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {{
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url === 'dataset.json' || url.endsWith('/dataset.json')) {{
      return Promise.resolve(new Response(JSON.stringify(DATASET), {{
        status: 200, headers: {{ 'Content-Type': 'application/json' }},
      }}));
    }}
    if (url === 'precomputed/results.json' || url.endsWith('/precomputed/results.json')) {{
      if (PRECOMP === null) return Promise.resolve(new Response('', {{ status: 404 }}));
      return Promise.resolve(new Response(JSON.stringify(PRECOMP), {{
        status: 200, headers: {{ 'Content-Type': 'application/json' }},
      }}));
    }}
    return nativeFetch(input, init);
  }};
}})();
</script>
"""

    html = html.replace(
        '<script src="pipeline.js"></script>',
        f'{shim}\n<script>\n{pipeline_js}\n</script>',
    )
    html = html.replace(
        '<script src="app.js"></script>',
        f'<script>\n{app_js}\n</script>',
    )

    pathlib.Path(out_path).write_text(html)
    size_kb = pathlib.Path(out_path).stat().st_size / 1024
    print(f"wrote {out_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "bundle.html")
    main(out)
