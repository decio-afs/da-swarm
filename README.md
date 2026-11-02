# DA Swarm

Watch a swarm of AI agent cursors rebuild your website live.

Add one script tag to your site. Visit any page with `?swarm` on the end of the URL, and the page blanks out while a swarm of named cursors builds it back: typing the text, dragging out the boxes and fading the images in. Turn on **Tour** and it scrolls the whole page by itself, ready to screen-record.

- One file, about 20 KB, no dependencies, no build step for your site.
- Normal visitors never see it. It only runs when you ask for it.
- Nothing is sent anywhere. It only animates what is already on your page.
- Stopping puts the page back exactly as it was.

Made by [DA Agency](https://www.daagencyllc.com).

---

## Try the demo

```bash
git clone https://github.com/decio-afs/da-swarm.git
cd da-swarm
python -m http.server 5600
```

Open <http://localhost:5600/demo/index.html?swarm&tour=1>, or open the demo without `?swarm` and click **Watch it build**.

## Add it to your website

Paste this before the closing `</body>` tag. `@1` always serves the latest 1.x release; pin an exact version such as `@1.0.1` if you prefer.

```html
<script src="https://cdn.jsdelivr.net/gh/decio-afs/da-swarm@1/dist/da-swarm.min.js" defer></script>
```

Prefer to host it yourself? Download [`dist/da-swarm.min.js`](dist/da-swarm.min.js), upload it to your site and point the `src` at it.

### Next.js (App Router)

```tsx
// app/layout.tsx
import Script from 'next/script';

// inside <body>, after {children}:
<Script
  src="https://cdn.jsdelivr.net/gh/decio-afs/da-swarm@1/dist/da-swarm.min.js"
  strategy="afterInteractive"
  data-delay="500"
/>
```

### WordPress, Webflow, Squarespace, Shopify, Wix

Paste the script tag into the site's **footer code** or **custom code (end of body)** setting. Publish, then visit any page with `?swarm`.

## Turn it on and off

| How | What it does |
| --- | --- |
| Add `?swarm` to any page URL | Starts the swarm when the page loads. Add settings too: `?swarm&tour=1&agents=24&speed=2` |
| **Alt + Shift + S** | Toggles it on any page that has the script. Ignored while typing in a form field |
| A button on your own site | Give any element `data-swarm-toggle` and clicking it toggles the swarm: `<button data-swarm-toggle>Watch it build</button>` |
| A ready-made button | Add `data-button="true"` to the script tag for a small floating **Watch it build** button |
| **Esc** or ✕ in the toolbar | Stops it and restores the page |
| ↻ in the toolbar | Builds the page again from the top |

While it runs, the toolbar at the bottom shows the agent count and layers built. Its **1×** button cycles the speed and **Tour** turns auto-scrolling on and off.

## Settings

Set them on the script tag (`data-…`) as your defaults. A URL parameter overrides the script tag for that visit.

| Setting | Script tag | URL | Default |
| --- | --- | --- | --- |
| Agents at rest | `data-agents="16"` | `agents=16` | `16` |
| Most agents while scrolling fast | `data-max-agents="48"` | `max=48` | `48` |
| Build speed (1, 2 or 3) | `data-speed="1"` | `speed=1` | `1` |
| Auto-scroll the page | `data-tour="true"` | `tour=1` | off |
| Jump to the top first | `data-from-top="true"` | `top=1` | on |
| Name tags on cursors | `data-labels="true"` | `labels=1` | on |
| Bottom toolbar | `data-toolbar="true"` | `toolbar=1` | on |
| Agent names, comma separated | `data-names="Ava, Hunter, Sage"` | `names=Ava,Hunter` | 48 built-in names |
| Wait before starting (ms) | `data-delay="4000"` | `delay=4000` | `0` |
| When it starts by itself | `data-trigger="query"` | — | `query` |
| Floating launcher button | `data-button="true"` | — | off |
| Button text | `data-button-label="See how it's built"` | — | `Watch it build` |
| Alt+Shift+S shortcut | `data-shortcut="false"` to turn off | — | on |

`data-trigger`:

- `query` (default): start only when the URL has `?swarm`.
- `always`: start on every page load. Only for demo pages.
- `manual`: never start by itself. Start it from your own code.

To leave something alone, such as a cookie banner or chat widget, give it `data-swarm-skip`. It and everything inside it stay visible and untouched.

## Recording tips

1. Open your page with `?swarm&tour=1`. Use `speed=1` for a calm build, or `2` for a short clip.
2. If your site has a loading screen, add `delay` so the swarm starts after it, e.g. `&delay=4000`.
3. Use full screen (F11) and start your screen recorder before the page loads, or press ↻ in the toolbar once recording.
4. For phone-shaped reels, record the browser's device mode or a phone. The toolbar compacts itself on small screens.

## JavaScript API

```js
DASwarm.start({ agents: 24, speed: 2, tour: true }); // any setting from the table, camelCase
DASwarm.stop();        // stop and restore the page
DASwarm.isRunning();   // true or false
DASwarm.inspect();     // a snapshot of progress, for debugging
```

## How it works

1. **Read the page.** It finds every visible piece of text, every image, video, SVG and form field, and every element with a background, border or shadow. Each is a layer.
2. **Hide without moving anything.** Text is wrapped in a hidden span, media is made transparent, and boxes lose their background and border. Nothing changes size, so the layout stays still.
3. **Build it back.** Each agent picks a nearby unbuilt layer on screen and flies to it. It types text letter by letter, drags a selection box out for media and boxes (showing the size, like a design tool), then fades the layer in.
4. **Follow the scroll.** Layers off screen wait until you scroll to them, and more agents join while you scroll fast. Anything you scroll past without building appears at once. In Tour mode it scrolls on by itself once each screen is finished.
5. **Restore.** Stopping removes every wrapper and class it added, so the page's HTML is exactly what it was.

## Good to know

- **React, Vue and other frameworks.** While the swarm runs, text sits inside temporary wrapper spans. Most sites are fine. If your page re-renders large parts of itself on a timer, stop the swarm before interacting with the page.
- **Your site's own animations.** Scroll-triggered fade-ins keep working, and they play on top of the build.
- **Privacy.** DA Swarm makes no network requests, stores nothing and adds no cookies.
- **Browsers.** Tested in Chrome on desktop and at phone size. It uses only standard browser features, so current Edge, Safari and Firefox should behave the same.

## Credits

Inspired by Joel Califa's Swarm and the [Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors) Chrome extension. DA Swarm is an independent implementation built for adding to your own website.

## License

[MIT](LICENSE) © DA Agency LLC
