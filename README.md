# GraphBoard v0.4.0

GraphBoard is a local-first relationship whiteboard for people, teams, projects, concepts, workflows, and other generic objects. It imports images, connects cards with magnetic relations, supports time slices, triangle event objects, grouping, layout, project save/open, and PNG export.

## Packages

- `windows-delivery/` — validated portable Windows launcher. Double-click `GraphBoard.exe` and keep the launcher window open.
- `web/` — static web deployment. Serve this folder from any static web host or open `index.html` directly for basic testing.
- `webgl/` — WebGL-enhanced deployment. WebGL renders the background grid while the existing SVG layer preserves the tested editing interactions.
- `docs/使用说明.zh-CN.md` — Chinese user guide.
- `docs/UserGuide.en.md` — English user guide.
- `examples/` — eight PNG examples covering the supported application areas.
- `examples-en/` — the same eight examples with English titles, groups, objects, and relation labels.

## Local privacy

Project data is processed locally in the browser. The launcher binds only to `127.0.0.1`; it does not upload images or require an account.

## Browser support

Use a current Edge, Chrome, Firefox, or Safari. WebGL is optional for the standard web package and required only for the WebGL-enhanced background.

## Current scope

This release is the first-phase delivery. Advanced category-theory path composition, rule validation, view mappings, and natural-language explanations are reserved for the second phase.
