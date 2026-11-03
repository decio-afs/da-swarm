# DA Swarm — Agent Guide

## Instruction source of truth

`AGENTS.md` is the authoritative entry point for all coding agents working in this project. Read it before making changes and maintain durable project instructions here. Do not create or maintain a separate `CLAUDE.md` instruction file. Supporting documentation provides implementation detail; it does not override this file. Apply parent `AGENTS.md` rules and any more specific nested `AGENTS.md` rules within their scope. Current user instructions take precedence over repository guidance.

## What this is

A drop-in script that makes a website look like a swarm of AI agent cursors is building it live. Site owners add one `<script>` tag; it runs only on `?swarm`, the Alt+Shift+S shortcut, or a `data-swarm-toggle` element. Public, MIT-licensed, by DA Agency LLC. GitHub: `decio-afs/da-swarm`; CDN: `https://cdn.jsdelivr.net/gh/decio-afs/da-swarm@<version>/dist/da-swarm.min.js`.

## Layout

```
src/swarm.js                 # the whole engine (vanilla JS, no dependencies) — edit this
dist/da-swarm.js             # copy of src (built)
dist/da-swarm.min.js         # minified build (built) — what sites load
demo/index.html              # sample landing page, loads dist/da-swarm.min.js
test/script-tag-config.html  # checks data-* settings, data-swarm-skip and data-swarm-toggle
README.md                    # user docs: install, toggles, settings table, recording tips
```

## Commands

```bash
npm install          # esbuild only
npm run build        # rebuild dist/ from src/swarm.js — run before every commit that changes src
npm run demo         # python -m http.server 5600, then open /demo/index.html?swarm&tour=1
```

`dist/` is committed on purpose: jsDelivr serves it straight from GitHub tags.

## Rules

- **Never change the page's layout.** Text is hidden by wrapping its text node in a `visibility:hidden` span, media by `opacity:0`, boxes by removing background, border and shadow. Anything that changes size would make the page jump.
- **Restore exactly.** `stop()` must leave `document.body.innerHTML` identical to before `start()` on a static page (that includes removing a `class` attribute the element did not have). Re-check this after any change to hiding or revealing.
- **Never rely on `requestAnimationFrame` alone.** The loop uses rAF with a timer fallback (`schedule()`), and tour scrolling runs in that loop, not `scroll-behavior: smooth`. Throttled tabs and embedded previews deliver no animation frames.
- **Cursors move only for a task.** Phases: `intro` (rotating circle in the centre), `build`, `outro` (the circle drifting around the screen until stopped). An idle agent holds its position; the swarm gathers into the circle only when every agent has been idle for 1.3s (`updateGathering`), which a continuous tour rarely allows. The tour (`stepTour`) is one continuous scroll that never stops: its speed eases toward `base × factor`, where the factor falls as unbuilt work on screen grows (`tourLoad`, weighting work near the top most) and helpers join on busy screens. `inspect().skipped` counts layers scrolled past before an agent built them; keep it at 0 on the demo and a real site. Movement is a critically damped spring (`stepAgents`), so cursors never snap. Agent positions are page coordinates (rendered minus the scroll), so idle cursors scroll with the page; target functions return viewport coordinates unless they set `page: true`. In formation, each agent has its own `lane`, `drift`, `bob` and `phase` so the circle swims like a school of fish rather than a ring of beads; the arrow faces its actual velocity (or the target's `heading` when nearly still); name tags hide (`das-form`). Each agent has a `tempo` (0.7–1.35) that scales its waits (`wait()`) and spring stiffness, so the swarm works off-beat.
- **Nothing leaves the page.** No network requests, storage or cookies.
- **Normal visitors must never see it** unless the site owner opts in (`data-trigger="always"` or `data-button`).
- Keep the settings table in `README.md` in sync with `readConfig()` in `src/swarm.js`.

## Testing a change

1. `npm run build`.
2. Serve the repo (`npm run demo`) and open `demo/index.html?swarm&tour=1`: every layer builds (toolbar shows `N/N` and "Done"), the tour reaches the bottom.
3. In the console: snapshot `document.body.innerHTML`, `DASwarm.start()`, stop mid-build, and confirm the HTML is identical. Repeat after scrolling away mid-build and after a full tour build.
4. Open `test/script-tag-config.html`: 5 agents named One/Two/Three/Agent 4/Agent 5, no toolbar, the skipped paragraph stays visible, the toggle button stops it.
5. Pause mid-build (❚❚ or P): every agent circles the screen centre, the built count stays still, the status says Paused and the selection boxes hide. Resume: the build carries on and finishes; the final time excludes the pause. Also pause during the intro.
6. Check phone width (375px): the toolbar fits and is centred.
7. Try a real framework site (e.g. a Next.js site) for console errors.

## Releasing

Bump `version` in `package.json` and the banner in the `build` script, run `npm run build`, commit, then tag `v<version>` and push the tag. The README uses `@1`, so 1.x releases reach sites without editing it.
