# Fieldnotes Garden Planner

A React garden-planning app for laying out a garden, sizing beds, and planning plant placement at mature size. Garden plans are saved in the browser's local storage.

## Getting started

```sh
npm install
npm run dev
```

## Tests

```sh
npm test
npm run test:e2e
```

The end-to-end tests use Playwright's Chromium browser. Install it once with `npx playwright install chromium`.

## Planning

- Create and name multiple gardens, rename them later, switch between them, and delete gardens you no longer need. The last remaining garden cannot be deleted.
- Set the garden width and length in feet.
- Add beds, adjust their size and name, and drag them to reposition them on the garden map.
- Rotate beds in 90-degree increments; their plant placements rotate with them.
- Open a bed to add plants, set each plant's mature width and depth, and click a square in the bed grid to place the selected plant.
- Set a plant group's count to plan many of the same plant, such as 14 carrots, together in one bed.
- Bed and plant footprints are shown at their planned mature size.
