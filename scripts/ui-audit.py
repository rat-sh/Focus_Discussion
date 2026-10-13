"""Render every route at desktop + phone sizes and report layout problems.
Usage: python3 scripts/ui-audit.py http://localhost:4180   (needs: pip install playwright && playwright install chromium)"""
import sys, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
ROUTES = ['/', '/rooms', '/rooms/r_1', '/rooms/r_1/r_1_s4', '/friends', '/u/vihaan.reddy', '/materials', '/focus', '/schedule', '/stats', '/recap/f_3', '/settings', '/j/DSA-482', '/j/FULL-001', '/room/DSA-482']
SIZES = {'w320': (320, 640), 'w360': (360, 740), 'w390': (390, 844), 'w430': (430, 932), 'tablet': (768, 1024), 'desktop': (1440, 900), 'phone-landscape': (844, 390)}

AUDIT_JS = """() => {
  const out = {hscroll: document.documentElement.scrollWidth > innerWidth + 1, tiny: [], small_targets: [], offscreen: [], squeezed_icons: []};
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e)) continue;
    const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasText) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.tiny.push((e.textContent||'').trim().slice(0, 24) + ' @' + fs); }
    if (innerWidth < 768 && e.matches('button, a[href], input, select, [role=tab], [role=switch]') && !e.closest('[aria-hidden=true]')) {
      const r = e.getBoundingClientRect();
      const type = e.getAttribute('type');
      if (type === 'checkbox' || type === 'range' || type === 'file') continue;
      if (r.height < 40 || r.width < 40) out.small_targets.push(((e.getAttribute('aria-label') || e.textContent || e.tagName)).trim().slice(0, 22) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    if (e.tagName === 'svg' && e.closest('button, a') && e.getBoundingClientRect().width < 10) out.squeezed_icons.push((e.closest('button, a').getAttribute('aria-label') || 'icon') );
    const r = e.getBoundingClientRect();
    if (r.right > innerWidth + 2 && !e.closest('.overflow-x-auto, .overflow-auto, [class*=snap-x], svg, .no-scrollbar')) out.offscreen.push((e.className||'').toString().slice(0, 40));
  }
  out.tiny = [...new Set(out.tiny)].slice(0, 6); out.small_targets = [...new Set(out.small_targets)].slice(0, 8); out.offscreen = [...new Set(out.offscreen)].slice(0, 4); out.squeezed_icons = [...new Set(out.squeezed_icons)].slice(0, 6);
  return out;
}"""

report = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    for size, (w, h) in SIZES.items():
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 768 or h < 500), is_mobile=(w < 768 or h < 500), permissions=['camera'])
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:120]))
        pg.on('console', lambda m: errs.append(m.text[:120]) if m.type == 'error' and 'ERR_' not in m.text else None)
        for r in ROUTES:
            pg.goto(BASE + r); pg.wait_for_timeout(450)
            res = pg.evaluate(AUDIT_JS)
            issues = {k: v for k, v in res.items() if v}
            if issues: report[f'{size} {r}'] = issues
            if '--shots' in sys.argv: pg.screenshot(path=f'/tmp/shots/{size}_{r.strip("/").replace("/", "_") or "home"}.png')
        if errs: report[f'{size} console'] = errs[:5]
        ctx.close()
    b.close()
print(json.dumps(report, indent=1) if report else 'NO ISSUES')
