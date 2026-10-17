# CrawlMarks

CrawlMarks helps barebow archers make distance marks for their tab.

**Try it:** https://jotux.github.io/CrawlMarks/

Barebow archers aim by string walking: they move their hand down the string below the nock by a set amount (the "crawl") for each distance. Many mark these crawl positions on the tab face. CrawlMarks turns a few sight-in readings into a full set of tab marks and a key card that maps each mark to a distance.

## How it works

The app walks you through five steps:

1. **Describe your tab.** Enter your shooting hand, the size of the tab face, the part of the face you can mark, and the distances you want to sight in.
2. **Print a sight-in strip.** CrawlMarks makes a strip sized to your tab that reads 0–50 down the marking zone, whatever size your tab is. Numbered major lines sit every 10, with ten divisions between them (a longer tick at each 5). On a zone shorter than 50 mm the small ticks drop to every 2 units so they stay at least 1 mm apart. Print it at 100% scale, check it against the 50 mm scale bar, cut it out and stick it on the tab.
3. **Enter your readings.** Shoot each distance until your arrows group, then enter the strip reading level with your nock. The number is 0–50, and you can judge halfway between ticks. Mark the distance where you are point-on, meaning no crawl is needed.
4. **Fit the curve.** CrawlMarks fits a curve through your readings and shows how well it matches them.
5. **Get your marker sheet.** You get two things to print:
   - **A tab template at 1:1.** It has only plain lines: a long line every 5 m and a short line for each step in between (you pick how many). Its width starts at your tab's face width and can be set anywhere from 10 mm up to 20 mm wider than the face.
   - **A key card the size of a US business card** (3.5 × 2 in). It shows the same line layout, stretched to fill the card's height, with every line numbered (L1, L2, L2·3 and so on) and the distance it stands for. It fits in a wallet or quiver pocket, not on the tab.

## The crawl model

Close up, your arrow sits below your line of sight, so the crawl does not keep shrinking as you move closer. It grows to a peak (the **fold**) and then shrinks again. CrawlMarks fits this model to your readings:

```
crawl(d) = a − b/d − c·d
```

Here `d` is the distance in metres. The fold is at `d = √(b/c)`. Each near distance `d` shares its crawl with a far distance `b / (c·d)`, so one tab line works for both. The key card lists near distances against the far mark they share. That is why the app suggests sighting in at a few short distances as well as long ones. Which distances count as near is only decided after sight-in, from where the fitted fold falls.

## World Archery rules

Under World Archery barebow rules, marks on a tab must be simple and uniform. The marker sheet keeps to this:

- Only two line lengths, all the same thickness and colour.
- No numbers or writing on the tab face.
- The key card is kept separate from the tab.

## Standalone by design

CrawlMarks needs no server, account or network connection. The build is a single `index.html` with its code, styles and fonts inlined. Open it from disk, put it on a USB stick, or host it on any static web server. Your tab size and readings are saved in your browser's local storage and never leave your device.

Printing uses the browser's own print dialog, which can also save to PDF. The strip, tab template and key card print at true millimetre size, so always print at 100% scale.

## Development

Requires Node 18 or newer.

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests for the curve fit, mark layout and screens
npm run build    # writes the standalone app to dist/index.html
```

The code is organised like this:

- `src/model/`: the crawl fit and mark layout. These are pure functions with no UI.
- `src/screens/`: one component per step.
- `src/components/drawings.tsx`: the strip, tab template and key card. They are drawn in millimetres so they print 1:1.

The original design prototype is in [prototype/](prototype/).
