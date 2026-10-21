# CrawlMarks

CrawlMarks helps barebow archers make distance marks for their tab.

**Try it:** https://www.crawlmarks.app

Barebow archers aim by string walking: they move their hand down the string below the nock by a set amount (the "crawl") for each distance. Many mark these crawl positions on the tab face. CrawlMarks turns a few sight-in readings into a full set of tab marks and a key card that maps each mark to a distance.

## How it works

The app walks you through five steps:

1. **Describe your tab.** Choose metric (mm and metres) or imperial (inches and yards), then enter your shooting hand, the size of the tab face, the part of the face you can mark, and the distances you want to sight in.
2. **Print a sight-in strip.** CrawlMarks makes a strip sized to your tab that reads 0–50 down the marking zone, whatever size your tab is. Numbered major lines sit every 10, with ten divisions between them (a longer tick at each 5). On a zone shorter than 50 mm the small ticks drop to every 2 units so they stay at least 1 mm apart. Print it at 100% scale, check it against the 50 mm scale bar, cut it out and stick it on the tab. The printed page also has a table for writing down your reading at each distance.
3. **Enter your readings.** Shoot each distance until your arrows group, then enter the strip reading level with your nock. The number is 0–50, and you can judge halfway between ticks. Mark the distance where you are point-on, meaning no crawl is needed.
4. **Fit the curve.** CrawlMarks fits a curve through your readings and shows how well it matches them. You can pick which curve to use.
5. **Get your marker sheet.** You get two things to print:
   - **A tab template at 1:1.** It has only plain lines: a long line every 5 m and a short line for each step in between (you pick how many). Its width starts at your tab's face width and can be set anywhere from 10 mm up to 20 mm wider than the face.
   - **Lines on the tab:** *Every 5 m* (the default) draws lines from the fitted curve. *Recorded only* draws one line for each distance you recorded, at your reading, with nothing in between. It needs no curve, so it works with just two readings.
   - **A key card the size of a US business card** (3.5 × 2 in). It shows the same line layout, stretched to fill the card's height, with every line numbered (L1, L2, L2·3 and so on) and the distance it stands for. It fits in a wallet or quiver pocket, not on the tab.

## Saving and sharing

Your current work is kept in your browser automatically. To keep more than one setup (say, indoor and outdoor), open the menu (the three arrows at the top left on a phone, or the Setup box in the sidebar on desktop):

- **Save** or **Save as…** stores the current setup under a name, in this browser only.
- **Open…** lists your saved setups. Delete one with its ✕.
- **Share link** makes a link (and a QR code) holding the whole setup: tab size, distances, readings and marker sheet settings. Open it on your phone or another computer to load it there. The setup travels in the part of the link after `#`, which browsers never send to the server.
- **New setup** starts again from the defaults.

## The crawl model

On the curve step you choose the curve to fit to your readings. `d` is the distance in metres.

| Curve | Formula | When to use it |
|---|---|---|
| **Quadratic** (default) | `a − c·d − e·d²` | A general-purpose fit for aiming with the arrow point. The `d²` term lets crawl bend smoothly with distance, but it is a curve fitted to your readings, not a physical model. It has no term for your eye sitting above the arrow, so it can't turn back up close. |
| **Linear** | `a − c·d` | A few readings over a narrow range of distances. |
| **Ballistic** | `a − b/d − c·d` | Readings where crawl peaks and then shrinks again up close. Built from simple flight physics: `b/d` is your eye sitting above the arrow, which matters most up close, and `c·d` is gravity. It leaves out drag, so it can read slightly low at long distances. |
| **Manual (join the dots)** | none | A smooth line through every reading that never overshoots between them. Errors in a reading are not smoothed out. |
| **Auto** | | Picks linear, quadratic or ballistic, whichever best predicts each reading from the others. |

If the chosen curve peaks inside your readings, that peak is the **fold**. Each near distance then shares its crawl with a far distance on the other side of the fold, so one tab line works for both. The key card lists near distances against the far mark they share.

## World Archery rules

Under World Archery barebow rules, marks on a tab must be simple and uniform. The marker sheet keeps to this:

- Only two line lengths, all the same thickness and colour.
- No numbers or writing on the tab face.

Whether you can carry the key card varies by event, so check the rules for each event you shoot.

## Standalone by design

CrawlMarks needs no server, account or network connection. The build is a single `index.html` with its code, styles and fonts inlined. Open it from disk, put it on a USB stick, or host it on any static web server. Your tab size, readings and saved setups are kept in your browser's local storage and never leave your device unless you share a link.

The hosted site at www.crawlmarks.app counts visits with Cloudflare Web Analytics, which uses no cookies and collects nothing you enter in the app. Cloudflare adds it when serving the page, so the build itself has no tracking and a copy run from disk sends nothing.

Printing uses the browser's own print dialog, which can also save to PDF. The strip, tab template and key card print at true millimetre size, so always print at 100% scale.

## Development

Requires Node 18 or newer.

```sh
npm install
npm run dev      # local dev server; open /preview.html for phone and desktop side by side, with a light/dark toggle
npm test         # unit tests for the curve fit, mark layout and screens
npm run build    # writes the standalone app to dist/index.html
```

The code is organised like this:

- `src/model/`: the crawl fit and mark layout. These are pure functions with no UI.
- `src/screens/`: one component per step.
- `src/components/drawings.tsx`: the strip, tab template and key card. They are drawn in millimetres so they print 1:1.

The original design prototype is in [prototype/](prototype/).
