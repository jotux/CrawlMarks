/**
 * ?theme=light or ?theme=dark pins the theme instead of following the system, for previewing both
 * (preview.html). It rewrites each stylesheet's prefers-color-scheme queries to always or never match,
 * so the CSS needs nothing extra.
 */
export function applyThemeOverride() {
  const theme = new URLSearchParams(location.search).get('theme');
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.style.colorScheme = theme;
  const pin = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        rule.media.mediaText = rule.media.mediaText.replace(
          /\(\s*prefers-color-scheme\s*:\s*(\w+)\s*\)/g,
          (_, scheme: string) => (scheme === theme ? '(min-width: 0px)' : '(max-width: -1px)'),
        );
      }
      if ('cssRules' in rule) pin((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { pin(sheet.cssRules); } catch { /* a cross-origin sheet: not ours */ }
  }
}
