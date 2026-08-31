# GraphBoard v0.4.0 User Guide

## Quick start

### Windows build

1. Open `windows/`.
2. Double-click `GraphBoard.exe`.
3. Keep the launcher window open while using the board.
4. If the browser does not open automatically, copy the `http://127.0.0.1:<port>/` address shown in the launcher window.
5. Close the launcher window to stop the local service.

### Web deployment

Upload the `web/` folder to GitHub Pages, Cloudflare Pages, Netlify, or another static host. It can also be served by any local static web server.

### WebGL-enhanced build

Deploy `webgl/` as an independent static site. WebGL renders the background grid while the existing SVG layer preserves the tested graph editing interactions. If WebGL is unavailable, the page keeps a normal background fallback.

## Basic operations

- Import: click Import, or drag PNG/JPG/WebP/GIF files onto the canvas.
- Rename: select an object and edit Name in the inspector; double-clicking the name focuses the field.
- Move: drag objects. Magnetic snapping is enabled by default; hold `Alt` to pause it.
- Connect: drag from a small port at an object edge to another object.
- Delete: select an object and press `Delete` or `X`.
- Save/Open: use Save Project and Open Project. Projects use the `.graphboard.json` extension.
- Export: click Export PNG.

## Time slices

- Use the period selector in the top bar to switch the active period.
- Select `＋新增时期…` to create a new period such as 2025 or 2026.
- Select an object and click its `＋` tag to assign a new period to that object.
- Objects with an assigned period show the year on the right side of the card.

## Triangle objects

Triangle objects can represent events, works, stages, projects, or intermediary nodes. If a circle object is selected when a triangle is created, the triangle is locked to that circle and follows it when moved. Triangle objects can still connect to any object using white arrows.

## Layout modes

- Align by group: the default mode; preserves group membership.
- Category layers: arranges nodes by directed relation depth.
- Focus selected object: places first- and second-degree relations around the selected node.
- Keep manual layout: only resolves obvious overlaps and preserves the overall composition.

## Example gallery

The Example bar at the bottom of the canvas provides eight pre-filled graphs: company collaboration, character relations, academic lineage, supply chain, knowledge system, software dependencies, workflow, and category mapping. Click an example to load its objects, relations, and group names, then inspect or continue editing it. Chinese example PNGs are in `examples/`; English showcase PNGs are in `examples-en/`.

## Shortcuts

`V` select, `G` move mode, `R` relation mode, `F` fit view, `Esc` cancel, `Delete/X` delete, `Ctrl+Z` undo, `Ctrl+Y` redo.

## Privacy and troubleshooting

Project data is processed locally in the browser. The Windows launcher binds only to `127.0.0.1`. If browser launch fails, the service remains running; copy the local URL and inspect `GraphBoard-launcher.log`.
