"""Local-only browser checks for the public landing hero.

Start Vite with dummy configuration (never production credentials):
  VITE_SUPABASE_URL=https://example.supabase.co \
  VITE_SUPABASE_ANON_KEY=local-preview-only \
  VITE_STRIPE_PK=pk_test_local_preview npm run dev -- --port 5174

In another terminal:
  uv run --with playwright python scripts/test_landing_hero.py --url http://localhost:5174
First use: uv run --with playwright python -m playwright install chromium

No live data is read or submitted. Non-local requests are blocked and the
existing public-stats endpoint is stubbed. Optional --screenshots DIR writes
review images; these are not committed by this script.
"""

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

WIDTHS = (320, 360, 390, 450, 599, 600, 768, 899, 900, 1024, 1200, 1440)
CRITICAL = (
    ".fex-handoff__quote-title",
    ".fex-handoff__coverage",
    ".fex-handoff__plan",
    ".fex-handoff__verified",
)


def intercept(route, origin):
    request = route.request
    if "/public-stats" in request.url and request.method == "GET":
        route.fulfill(json={"data": {"totalClosed": 0, "closedSales": 0}})
    elif request.url.startswith(origin + "/") and request.method in ("GET", "HEAD"):
        route.continue_()
    else:
        route.abort()


def assert_unobscured(page, selector):
    # Test points on the actual text, not the empty width of block elements.
    obscured = page.locator(selector).evaluate("""el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return [.2, .5, .8].some(t => {
        const hit = document.elementFromPoint(r.left + r.width*t, r.top+r.height/2);
        return !hit || !(el === hit || el.contains(hit));
      });
    }""")
    assert not obscured, f"Critical text obscured: {selector}"


def check_viewport(browser, origin, width, reduced, screenshots):
    context = browser.new_context(
        viewport={"width": width, "height": 1000},
        reduced_motion="reduce" if reduced else "no-preference",
    )
    context.route("**/*", lambda route: intercept(route, origin))
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(origin + "/")
    expect(page.locator("h1")).to_have_text("Real Intent. Real Results.")
    page.evaluate("document.fonts.ready")
    figure = page.locator("figure.fex-handoff")
    expect(figure).to_be_visible()
    expect(figure.locator("figcaption")).to_contain_text("Illustrative Website lead.")
    assert figure.get_attribute("aria-labelledby"), "Figure needs a text alternative"
    assert figure.locator("button, a, input, [tabindex]").count() == 0
    assert page.locator("body").evaluate("el => el.scrollWidth") <= width + 1
    assert page.locator("main").evaluate("el => el.scrollWidth <= el.clientWidth + 1")
    figure.scroll_into_view_if_needed()
    for selector in CRITICAL:
        expect(page.locator(selector)).to_be_visible()
        assert_unobscured(page, selector)
        assert page.locator(selector).evaluate("el => getComputedStyle(el).opacity") == "1"

    scene_height = page.locator(".fex-handoff__scene").bounding_box()["height"]
    if width <= 450:
        assert scene_height <= 286, f"Mobile artwork too tall: {scene_height}"
    animation = page.locator(".fex-handoff__thread-trace").evaluate("""el => ({
        name: getComputedStyle(el).animationName,
        count: getComputedStyle(el).animationIterationCount
    })""")
    assert animation["count"] != "infinite", "Hero must not loop"
    if reduced:
        assert animation["name"] == "none", "Reduced motion must skip the trace"

    if screenshots and width in (320, 390, 1024, 1440) and not reduced:
        page.locator("h1").scroll_into_view_if_needed()
        page.screenshot(path=str(screenshots / f"hero-{width}.png"))
        figure.screenshot(path=str(screenshots / f"art-{width}.png"))

    # The primary signup path is unchanged and there are no fake CTA controls.
    form = page.locator("form#get-started")
    form.get_by_role("textbox", name="Your email").fill("agent@example.test")
    form.get_by_role("button", name="Get access").click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role("textbox", name="Email", exact=True)).to_have_value(
        "agent@example.test"
    )
    page.keyboard.press("Escape")
    expect(dialog).not_to_be_visible()
    assert not errors, errors
    context.close()
    return {"width": width, "reduced_motion": reduced, "scene_height": scene_height}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:5174")
    parser.add_argument("--screenshots", type=Path)
    parser.add_argument("--browser", choices=("chromium", "firefox", "webkit"), default="chromium")
    args = parser.parse_args()
    parsed = urlparse(args.url)
    if parsed.hostname not in ("localhost", "127.0.0.1") or parsed.scheme != "http":
        parser.error("--url must be an HTTP localhost preview, never a live site")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser = getattr(playwright, args.browser).launch(headless=True)
        for width in WIDTHS:
            results.append(check_viewport(browser, origin, width, False, args.screenshots))
        for width in (390, 1440):
            results.append(check_viewport(browser, origin, width, True, args.screenshots))
        browser.close()
    print(json.dumps({"browser": args.browser, "passed": len(results), "cases": results}, indent=2))


if __name__ == "__main__":
    main()
