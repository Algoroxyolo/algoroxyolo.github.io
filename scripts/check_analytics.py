"""Check GoatCounter coverage in published pages, templates, and generated pages."""
from pathlib import Path
from html.parser import HTMLParser
import json
import subprocess
from build_academic import Renderer

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {
    "assets/plotly/demo.html": "Embedded library demonstration",
    "flywheel/index.html": "Protected page",
    "jarvis/index.html": "Separate workspace application",
}
ENDPOINT = "https://algoroxyolo.goatcounter.com/count"

class Scripts(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.trackers = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and ("goatcounter" in attrs.get("src", "") or
                "gc.zgo.at/count.js" in attrs.get("src", "") or "data-goatcounter" in attrs):
            self.trackers.append(attrs)

def check(name, text):
    trackers = Scripts(text).trackers
    assert len(trackers) == 1, f"{name}: expected one tracker, found {len(trackers)}"
    tracker = trackers[0]
    assert tracker.get("data-goatcounter") == ENDPOINT, f"{name}: wrong endpoint"
    assert tracker.get("src") in ("https://gc.zgo.at/count.js", "//gc.zgo.at/count.js"), name
    assert "async" in tracker, f"{name}: tracker must load asynchronously"

def main():
    paths = subprocess.check_output(["git", "ls-files", "*.html"], cwd=ROOT, text=True).splitlines()
    checked = 0
    for name in paths:
        if name in EXCLUDED:
            continue
        check(name, (ROOT / name).read_text(encoding="utf-8-sig"))
        checked += 1
    generated = Renderer(json.loads((ROOT / "data/academic.json").read_text(encoding="utf-8"))).website()
    count = 0
    for name, text in generated.items():
        if name.endswith(".html"):
            check("generated:" + name, text)
            count += 1
    print(json.dumps({"checked_html": checked, "generated_html": count, "excluded": EXCLUDED}))

if __name__ == "__main__":
    main()
