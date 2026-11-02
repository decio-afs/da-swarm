/*
 * DA Swarm — rebuilds any web page live with a swarm of agent cursors.
 *
 * The page is already built. DA Swarm hides its text, media and boxes without
 * changing the layout, then a swarm of named cursors "builds" each piece back:
 * typing text, dragging out boxes and fading media in. Nothing is sent anywhere
 * and stop() restores the page exactly.
 *
 * API: window.DASwarm.start(config), .stop(), .isRunning()
 * By DA Agency — https://www.daagencyllc.com
 */
(() => {
    'use strict';
    if (window.DASwarm) return;

    const DEFAULTS = {
        agents: 16, // swarm size at rest
        maxAgents: 48, // ceiling while scrolling fast
        speed: 1, // 1, 2 or 3
        tour: false, // auto-scroll the page as each screen finishes
        fromTop: true, // jump to the top before building
        labels: true, // name tags on cursors
        toolbar: true, // bottom status bar
        names: [
            'Ava', 'Hunter', 'Sage', 'Nova', 'Atlas', 'Echo', 'Iris', 'Orion',
            'Pixel', 'Rex', 'Vega', 'Zed', 'Kai', 'Luna', 'Milo', 'Nyx',
            'Odin', 'Quinn', 'Remy', 'Sol', 'Tess', 'Uma', 'Vox', 'Wren',
        ],
    };
    const COLORS = [
        '#f64e6e', '#ff795e', '#ffb547', '#7ee081', '#38d9f5', '#4dabf7',
        '#748ffc', '#9775fa', '#da77f2', '#f783ac', '#3ddc97', '#ffd43b',
    ];
    const SKIP_TAGS = new Set([
        'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE',
        'OPTION', 'BR', 'WBR', 'SOURCE', 'TRACK',
    ]);
    const MEDIA_TAGS = new Set([
        'IMG', 'VIDEO', 'CANVAS', 'svg', 'SVG', 'IFRAME', 'INPUT', 'TEXTAREA',
        'SELECT', 'OBJECT', 'EMBED', 'PROGRESS', 'METER',
    ]);
    const STOPPED = Symbol('das-stopped');
    const ROOT_ID = 'das-root';

    const CSS = `
.das-h{visibility:hidden!important}
.das-mh{opacity:0!important}
.das-bh{background-color:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline-color:transparent!important}
.das-fade{transition:opacity .45s ease,background-color .45s ease,border-color .45s ease,box-shadow .45s ease!important}
.das-c{visibility:hidden}
.das-c.das-on{visibility:visible}
#${ROOT_ID}{position:fixed;inset:0;pointer-events:none;z-index:2147483646;font:500 12px/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:0;text-transform:none}
#${ROOT_ID} *{box-sizing:border-box}
.das-agent{position:absolute;left:0;top:0;will-change:transform;opacity:0;transition:opacity .35s ease}
.das-agent.das-in{opacity:1}
.das-agent svg{display:block;width:18px;height:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
.das-name{position:absolute;left:13px;top:17px;padding:3px 8px;border-radius:999px;color:#fff;font-size:11px;font-weight:600;line-height:1;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.das-sel{position:absolute;left:0;top:0;border:1.5px solid;border-radius:2px;will-change:transform,width,height}
.das-sel.das-dash{border-style:dashed}
.das-sel i{position:absolute;width:7px;height:7px;background:#fff;border:1.5px solid;border-color:inherit}
.das-sel i:nth-child(1){left:-4px;top:-4px}.das-sel i:nth-child(2){right:-4px;top:-4px}
.das-sel i:nth-child(3){left:-4px;bottom:-4px}.das-sel i:nth-child(4){right:-4px;bottom:-4px}
.das-dim{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);padding:2px 6px;border-radius:4px;color:#fff;font-size:10px;font-weight:600;white-space:nowrap}
.das-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:auto;display:flex;align-items:center;gap:10px;padding:7px 8px 7px 12px;border-radius:12px;background:rgba(12,12,14,.92);border:1px solid rgba(255,255,255,.12);color:#ececf1;box-shadow:0 12px 32px rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);white-space:nowrap}
.das-logo{font-weight:800;font-size:11px;letter-spacing:.08em;padding:3px 6px;border-radius:6px;color:#fff;background:linear-gradient(90deg,#f64e6e,#ff795e)}
.das-pulse{width:7px;height:7px;border-radius:50%;background:#3ddc97;box-shadow:0 0 0 0 rgba(61,220,151,.6);animation:das-pulse 1.4s infinite}
.das-done .das-pulse{animation:none;background:#9aa0a6}
@keyframes das-pulse{70%{box-shadow:0 0 0 7px rgba(61,220,151,0)}100%{box-shadow:0 0 0 0 rgba(61,220,151,0)}}
.das-bar b{font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.das-muted{color:#9aa0a6}
.das-prog{width:90px;height:4px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
.das-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f64e6e,#ff795e);transition:width .25s ease}
.das-status{padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.08);font-size:11px;font-weight:600}
.das-btn{all:unset;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;color:#ececf1;background:rgba(255,255,255,.08)}
.das-btn:hover{background:rgba(255,255,255,.16)}
.das-btn.das-active{background:linear-gradient(90deg,#f64e6e,#ff795e);color:#fff}
@media (max-width:640px){.das-prog,.das-hide-sm{display:none}}
@media (max-width:480px){.das-bar{gap:6px;padding:6px 6px 6px 8px;bottom:12px}.das-status{display:none}.das-btn{padding:4px 7px}}
`;

    const ARROW = (color) =>
        `<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M1.5 1.5v16.2l4.6-4.3 2.9 6.6 3-1.3-2.9-6.5 6.3-.2z" fill="${color}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

    let S = null; // running state

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const rand = (a, b) => a + Math.random() * (b - a);

    function alive(token) {
        if (!S || S.token !== token) throw STOPPED;
    }

    function sleep(ms) {
        const token = S.token;
        return new Promise((resolve, reject) => {
            setTimeout(() => (S && S.token === token ? resolve() : reject(STOPPED)), ms / S.cfg.speed);
        });
    }

    // ── Collecting layers ──────────────────────────────────────────────────────

    function isBox(el, cs, r) {
        if (el === document.body || el === document.documentElement) return false;
        if (r.width < 24 || r.height < 16) return false;
        const clip = cs.backgroundClip || cs.webkitBackgroundClip;
        if (clip === 'text' || cs.webkitBackgroundClip === 'text') return false;
        const bg = cs.backgroundColor;
        const hasBg = bg && bg !== 'transparent' && !/rgba?\([^)]*,\s*0\)$/.test(bg);
        const hasImg = cs.backgroundImage && cs.backgroundImage !== 'none';
        const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
            (s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && !/,\s*0\)$/.test(cs[`border${s}Color`])
        );
        const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
        return hasBg || hasImg || hasBorder || hasShadow;
    }

    function collect() {
        const layers = [];
        const sy = window.scrollY;
        const sx = window.scrollX;
        const walk = (el) => {
            for (let n = el.firstChild; n; n = n.nextSibling) {
                if (n.nodeType === Node.TEXT_NODE) {
                    if (!n.nodeValue.trim()) continue;
                    const parent = n.parentElement;
                    if (!parent || parent.closest(`#${ROOT_ID}`)) continue;
                    const range = document.createRange();
                    range.selectNodeContents(n);
                    const r = range.getBoundingClientRect();
                    if (r.width < 1 || r.height < 1) continue;
                    layers.push({ type: 'text', node: n, pageY: r.top + sy, pageX: r.left + sx, h: r.height, state: 0 });
                    continue;
                }
                if (n.nodeType !== Node.ELEMENT_NODE) continue;
                // data-swarm-skip leaves an element (and everything inside) untouched.
                if (SKIP_TAGS.has(n.tagName) || n.id === ROOT_ID || n.hasAttribute('data-swarm-skip')) continue;
                const cs = getComputedStyle(n);
                if (cs.display === 'none') continue;
                const r = n.getBoundingClientRect();
                const fixed = cs.position === 'fixed' || cs.position === 'sticky';
                const pageY = r.top + (fixed ? sy : sy);
                if (cs.visibility !== 'hidden' && r.width >= 4 && r.height >= 4) {
                    if (MEDIA_TAGS.has(n.tagName)) {
                        layers.push({ type: 'media', el: n, pageY, pageX: r.left + sx, h: r.height, state: 0 });
                        continue; // never look inside media (svg paths, iframes)
                    }
                    if (isBox(n, cs, r)) {
                        layers.push({ type: 'box', el: n, pageY, pageX: r.left + sx, h: r.height, state: 0 });
                    }
                }
                walk(n);
            }
        };
        walk(document.body);
        return layers;
    }

    function hideAll(layers) {
        for (const L of layers) {
            if (L.type === 'text') {
                const wrap = document.createElement('span');
                wrap.className = 'das-t das-h';
                L.node.parentNode.insertBefore(wrap, L.node);
                wrap.appendChild(L.node);
                L.wrap = wrap;
            } else {
                L.hadClass = L.el.hasAttribute('class');
                L.el.classList.add(L.type === 'media' ? 'das-mh' : 'das-bh');
            }
        }
    }

    // Remove our classes and, if the element had no class attribute before, the
    // now-empty attribute too, so the page's HTML ends up exactly as it was.
    function unmark(L, ...classes) {
        L.el.classList.remove(...classes);
        if (!L.hadClass && L.el.getAttribute('class') === '') L.el.removeAttribute('class');
    }

    function rectOf(L) {
        if (L.type === 'text') {
            if (!L.wrap.isConnected) return null;
            return L.wrap.getBoundingClientRect();
        }
        return L.el.isConnected ? L.el.getBoundingClientRect() : null;
    }

    // The part of a rect that is on screen, so huge sections are drawn where they are seen.
    function visibleRect(r) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const left = clamp(r.left, 0, vw);
        const top = clamp(r.top, 0, vh);
        const right = clamp(r.right, 0, vw);
        const bottom = clamp(r.bottom, 0, vh);
        return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top), right, bottom };
    }

    function refreshPositions() {
        const sy = window.scrollY;
        for (const L of S.layers) {
            if (L.state === 2) continue;
            const r = rectOf(L);
            if (!r) {
                L.state = 2; // removed from the page by the site itself
                S.built++;
                continue;
            }
            L.pageY = r.top + sy;
            L.h = r.height;
        }
        S.layers.sort((a, b) => a.pageY - b.pageY || a.pageX - b.pageX);
        S.cursor = 0;
    }

    // ── Revealing ──────────────────────────────────────────────────────────────

    function finish(L) {
        if (L.state === 2) return;
        L.state = 2;
        S.built++;
    }

    function revealNow(L) {
        if (L.state === 2) return;
        if (L.type === 'text') {
            if (L.wrap.firstChild !== L.node || L.wrap.childNodes.length !== 1) L.wrap.replaceChildren(L.node);
            L.wrap.classList.remove('das-h');
        } else {
            unmark(L, 'das-mh', 'das-bh');
        }
        finish(L);
    }

    function fadeIn(L, cls) {
        const el = L.el;
        el.classList.add('das-fade');
        // Force the hidden state to apply before removing it, so the transition runs.
        void el.offsetWidth;
        el.classList.remove(cls);
        setTimeout(() => unmark(L, 'das-fade'), 600);
    }

    // ── Overlays (selection boxes) ─────────────────────────────────────────────

    function addSelection(agent, rectFn, { dash = false, handles = false, dim = false } = {}) {
        const el = document.createElement('div');
        el.className = 'das-sel' + (dash ? ' das-dash' : '');
        el.style.borderColor = agent.color;
        if (handles) el.innerHTML = '<i></i><i></i><i></i><i></i>';
        let dimEl = null;
        if (dim) {
            dimEl = document.createElement('span');
            dimEl.className = 'das-dim';
            dimEl.style.background = agent.color;
            el.appendChild(dimEl);
        }
        S.root.appendChild(el);
        const sel = { el, dimEl, rectFn, progress: 1 };
        S.selections.add(sel);
        return sel;
    }

    function removeSelection(sel) {
        S.selections.delete(sel);
        sel.el.remove();
    }

    function drawSelections() {
        for (const sel of S.selections) {
            const r = sel.rectFn();
            if (!r) continue;
            const p = sel.progress;
            sel.el.style.transform = `translate(${r.left}px,${r.top}px)`;
            sel.el.style.width = `${Math.max(2, r.width * p)}px`;
            sel.el.style.height = `${Math.max(2, r.height * p)}px`;
            if (sel.dimEl) sel.dimEl.textContent = `${Math.round(r.width * p)} × ${Math.round(r.height * p)}`;
        }
    }

    // ── Agents ─────────────────────────────────────────────────────────────────

    function spawnAgent(helper) {
        // Reuse the first free name, so agents that come and go while scrolling do not
        // count up to "Agent 85".
        const names = S.cfg.names.length ? S.cfg.names : DEFAULTS.names;
        const used = new Set(S.agents.filter((a) => !a.gone).map((a) => a.name));
        let i = names.findIndex((n) => !used.has(n));
        let name = names[i];
        if (i === -1) {
            i = names.length;
            while (used.has(`Agent ${i + 1}`)) i++;
            name = `Agent ${i + 1}`;
        }
        S.spawned++;
        const color = COLORS[i % COLORS.length];
        const el = document.createElement('div');
        el.className = 'das-agent';
        el.innerHTML = ARROW(color) + (S.cfg.labels ? `<span class="das-name" style="background:${color}">${escapeHtml(name)}</span>` : '');
        S.root.appendChild(el);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const agent = {
            name, color, el, helper,
            x: rand(vw * 0.1, vw * 0.9), y: helper ? vh + 20 : rand(vh * 0.2, vh * 0.95),
            targetFn: null, curve: 0, arrive: null, retire: false, gone: false,
        };
        setTimeout(() => el.classList.add('das-in'), 16);
        S.agents.push(agent);
        runAgent(agent).catch((e) => {
            if (e !== STOPPED) console.error('[DA Swarm]', e);
        });
        return agent;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    function moveTo(agent, targetFn) {
        const token = S.token;
        agent.targetFn = targetFn;
        agent.curve = rand(-0.35, 0.35);
        return new Promise((resolve, reject) => {
            agent.arrive = { resolve, reject, token };
        });
    }

    function stepAgents(dt) {
        const k = 1 - Math.exp(-dt * 4.6 * Math.sqrt(S.cfg.speed));
        for (const a of S.agents) {
            if (a.gone || !a.targetFn) continue;
            const t = a.targetFn();
            if (!t) continue;
            const dx = t.x - a.x;
            const dy = t.y - a.y;
            const dist = Math.hypot(dx, dy);
            // A slight sideways pull while far away makes the path curve like a hand.
            const bend = dist > 40 ? a.curve : 0;
            a.x += dx * k - dy * bend * k;
            a.y += dy * k + dx * bend * k;
            a.el.style.transform = `translate(${a.x}px,${a.y}px)`;
            if (a.arrive && dist < 3) {
                const done = a.arrive;
                a.arrive = null;
                done.resolve();
            }
        }
    }

    function pickLayer(agent) {
        const vh = window.innerHeight;
        const sy = window.scrollY;
        const top = sy - vh * 0.1;
        const bottom = sy + vh * 0.98;
        while (S.cursor < S.layers.length && S.layers[S.cursor].state === 2) S.cursor++;
        let best = null;
        let bestScore = Infinity;
        let seen = 0;
        for (let i = S.cursor; i < S.layers.length && seen < 12; i++) {
            const L = S.layers[i];
            if (L.state !== 0) continue;
            if (L.pageY > bottom) break;
            if (L.pageY + L.h < top) continue;
            seen++;
            const r = rectOf(L);
            if (!r) continue;
            const v = visibleRect(r);
            const score = seen * 60 + Math.hypot(v.left + Math.min(v.width, 160) / 2 - agent.x, v.top - agent.y) * 0.35;
            if (score < bestScore) {
                bestScore = score;
                best = L;
            }
        }
        if (best) best.state = 1;
        return best;
    }

    async function runAgent(agent) {
        const token = S.token;
        while (true) {
            alive(token);
            if (agent.retire) return retireAgent(agent);
            const L = pickLayer(agent);
            if (!L) {
                await wander(agent, token);
                continue;
            }
            try {
                await sleep(rand(120, 380));
                alive(token);
                if (L.type === 'text') await buildText(agent, L, token);
                else await buildRect(agent, L, token);
            } catch (e) {
                if (e !== STOPPED && S && S.token === token) revealNow(L);
                throw e;
            }
        }
    }

    async function wander(agent, token) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = clamp(agent.x + rand(-vw * 0.18, vw * 0.18), 20, vw - 60);
        const y = clamp(agent.y + rand(-vh * 0.15, vh * 0.15), 20, vh - 90);
        agent.targetFn = () => ({ x, y });
        await sleep(rand(350, 900));
        alive(token);
    }

    function retireAgent(agent) {
        agent.gone = true;
        agent.el.classList.remove('das-in');
        setTimeout(() => agent.el.remove(), 400);
        S.agents = S.agents.filter((a) => a !== agent);
    }

    async function buildText(agent, L, token) {
        const wrap = L.wrap;
        const firstLine = () => {
            const rects = wrap.getClientRects();
            const r = rects[0] || wrap.getBoundingClientRect();
            return r;
        };
        await moveTo(agent, () => {
            const r = firstLine();
            return { x: r.left - 2, y: r.top + r.height * 0.55 };
        });
        alive(token);

        const text = L.node.nodeValue;
        const byWord = text.length > 220;
        const parts = byWord ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
        const frag = document.createDocumentFragment();
        const spans = parts.map((p) => {
            const s = document.createElement('span');
            s.className = 'das-c';
            s.textContent = p;
            frag.appendChild(s);
            return s;
        });
        wrap.replaceChildren(frag);
        wrap.classList.remove('das-h');
        const sel = addSelection(agent, () => wrap.getBoundingClientRect());

        const total = clamp(spans.length * (byWord ? 80 : 46), 420, 2400);
        const steps = Math.max(1, Math.min(spans.length, Math.round(total / 50)));
        const per = Math.ceil(spans.length / steps);
        for (let i = 0; i < spans.length; i += per) {
            const end = Math.min(i + per, spans.length);
            for (let j = i; j < end; j++) spans[j].classList.add('das-on');
            const last = spans[end - 1];
            agent.targetFn = () => {
                const r = last.getBoundingClientRect();
                return { x: r.right + 1, y: r.top + r.height * 0.6 };
            };
            await sleep(total / steps);
            alive(token);
        }
        wrap.replaceChildren(L.node);
        await sleep(120);
        removeSelection(sel);
        finish(L);
    }

    async function buildRect(agent, L, token) {
        const el = L.el;
        const rect = () => {
            const r = el.isConnected ? el.getBoundingClientRect() : null;
            return r ? visibleRect(r) : null;
        };
        await moveTo(agent, () => {
            const r = rect();
            return r ? { x: r.left, y: r.top } : { x: agent.x, y: agent.y };
        });
        alive(token);

        const sel = addSelection(agent, rect, { dash: L.type === 'box', handles: true, dim: true });
        sel.progress = 0;
        const r0 = rect();
        const size = r0 ? Math.hypot(r0.width, r0.height) : 200;
        const dur = clamp(480 + size * 0.6, 560, 1500);
        const start = performance.now();
        agent.targetFn = () => {
            const r = rect();
            if (!r) return null;
            return { x: r.left + r.width * sel.progress, y: r.top + r.height * sel.progress };
        };
        while (sel.progress < 1) {
            await sleep(16);
            alive(token);
            sel.progress = ease(clamp(((performance.now() - start) * S.cfg.speed) / dur, 0, 1));
        }
        fadeIn(L, L.type === 'media' ? 'das-mh' : 'das-bh');
        await sleep(380);
        removeSelection(sel);
        finish(L);
    }

    // ── Scroll, tour, catch-up ─────────────────────────────────────────────────

    function catchUp() {
        // Anything scrolled well past without being built appears at once, so the
        // page above never stays blank.
        const limit = window.scrollY - window.innerHeight * 0.5;
        let n = 0;
        for (const L of S.layers) {
            if (n > 80) break;
            if (L.state === 0 && L.pageY + L.h < limit) {
                revealNow(L);
                n++;
            }
        }
    }

    function trackScroll(dt) {
        const y = window.scrollY;
        const v = Math.abs(y - S.lastScrollY) / Math.max(dt, 0.001);
        S.lastScrollY = y;
        S.scrollSpeed = S.scrollSpeed * 0.9 + v * 0.1;
        const extra = Math.min(S.cfg.maxAgents - S.cfg.agents, Math.floor(S.scrollSpeed / 220) * 2);
        const want = S.cfg.agents + Math.max(0, extra);
        const active = S.agents.filter((a) => !a.retire).length;
        if (active < want && S.spawnCooldown <= 0) {
            spawnAgent(true);
            S.spawnCooldown = 0.06;
        } else if (active > want && S.scrollSpeed < 60) {
            const helper = S.agents.find((a) => a.helper && !a.retire);
            if (helper) helper.retire = true;
        }
        S.spawnCooldown -= dt;
    }

    function tourTick() {
        if (!S || !S.cfg.tour || S.finished) return;
        const vh = window.innerHeight;
        const sy = window.scrollY;
        let pending = 0;
        for (const L of S.layers) {
            if (L.state !== 2 && L.pageY >= sy - 10 && L.pageY < sy + vh * 0.92) pending++;
        }
        if (pending > 1) {
            S.screenDoneAt = 0;
            return;
        }
        // Hold each finished screen for a moment so a recording shows it complete.
        const now = performance.now();
        if (!S.screenDoneAt) S.screenDoneAt = now;
        if (now - S.screenDoneAt < 900 / S.cfg.speed) return;
        S.screenDoneAt = 0;
        const maxY = document.documentElement.scrollHeight - vh;
        if (sy >= maxY - 2 || S.tourTo !== null) return;
        S.tourTo = Math.min(maxY, sy + vh * 0.62);
    }

    // Tour scrolling runs in the swarm's own loop (not scroll-behavior: smooth), so it
    // keeps an even pace for recording and works where smooth scrolling is unavailable.
    function stepTour(dt) {
        if (S.tourTo === null) return;
        if (!S.cfg.tour) {
            S.tourTo = null;
            return;
        }
        const y = window.scrollY;
        const d = S.tourTo - y;
        if (Math.abs(d) < 1.5) {
            S.tourTo = null;
            return;
        }
        const step = d * (1 - Math.exp(-dt * 3.2 * Math.sqrt(S.cfg.speed)));
        const next = y + (Math.abs(step) < 1 ? Math.sign(d) : step);
        window.scrollTo(0, next);
        // A page that refuses to scroll further (end of page, scroll lock) ends the move.
        if (Math.abs(window.scrollY - y) < 0.5) S.tourTo = null;
    }

    // ── Toolbar ────────────────────────────────────────────────────────────────

    function buildBar() {
        const bar = document.createElement('div');
        bar.className = 'das-bar';
        bar.innerHTML = `
<span class="das-logo">DA</span>
<span class="das-pulse"></span><span><b data-agents>0</b> <span class="das-muted">agents</span></span>
<span class="das-hide-sm"><b data-built>0</b><span class="das-muted">/<span data-total>0</span> layers</span></span>
<span class="das-prog"><i></i></span>
<span class="das-status" data-status>Building</span>
<button class="das-btn" data-speed title="Build speed">1×</button>
<button class="das-btn" data-tour title="Auto-scroll the page">Tour</button>
<button class="das-btn" data-replay title="Build the page again">↻</button>
<button class="das-btn" data-close title="Stop and restore the page (Esc or Alt+Shift+S)">✕</button>`;
        bar.querySelector('[data-speed]').addEventListener('click', () => {
            S.cfg.speed = (S.cfg.speed % 3) + 1;
            updateBar(true);
        });
        bar.querySelector('[data-tour]').addEventListener('click', () => {
            S.cfg.tour = !S.cfg.tour;
            updateBar(true);
        });
        bar.querySelector('[data-replay]').addEventListener('click', () => {
            const cfg = { ...S.cfg };
            stop();
            start(cfg);
        });
        bar.querySelector('[data-close]').addEventListener('click', () => stop());
        S.root.appendChild(bar);
        S.bar = bar;
    }

    function updateBar(force) {
        if (!S.bar) return;
        const now = performance.now();
        if (!force && now - S.lastBar < 120) return;
        S.lastBar = now;
        const q = (s) => S.bar.querySelector(s);
        q('[data-agents]').textContent = S.agents.filter((a) => !a.gone).length;
        q('[data-built]').textContent = S.built;
        q('[data-total]').textContent = S.layers.length;
        q('.das-prog i').style.width = `${S.layers.length ? (S.built / S.layers.length) * 100 : 100}%`;
        const inView = S.layers.some((L) => L.state !== 2 && L.pageY < window.scrollY + window.innerHeight && L.pageY + L.h > window.scrollY);
        q('[data-status]').textContent = S.finished ? 'Done' : inView ? 'Building' : 'Scroll to build';
        S.bar.classList.toggle('das-done', S.finished);
        q('[data-speed]').textContent = `${S.cfg.speed}×`;
        q('[data-tour]').classList.toggle('das-active', S.cfg.tour);
    }

    // ── Main loop ──────────────────────────────────────────────────────────────

    // Frames come from requestAnimationFrame, with a timer as a fallback: some contexts
    // (throttled or off-screen tabs, embedded previews) deliver no animation frames, and
    // the swarm must not freeze there.
    function schedule() {
        if (!S) return;
        const s = S;
        let ran = false;
        const run = () => {
            if (ran || S !== s) return;
            ran = true;
            cancelAnimationFrame(s.raf);
            clearTimeout(s.tick);
            frame(performance.now());
        };
        s.raf = requestAnimationFrame(run);
        s.tick = setTimeout(run, 34);
    }

    function frame(now) {
        if (!S) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - S.last) / 1000));
        S.last = now;
        stepTour(dt);
        trackScroll(dt);
        catchUp();
        stepAgents(dt);
        drawSelections();
        if (!S.finished && S.built >= S.layers.length) {
            S.finished = true;
            for (const a of S.agents) a.retire = true;
        }
        updateBar(false);
        schedule();
    }

    function onKey(e) {
        if (e.key === 'Escape') stop();
    }

    function start(config) {
        if (S) stop();
        const cfg = { ...DEFAULTS, ...(config || {}) };
        cfg.agents = clamp(Math.round(cfg.agents) || DEFAULTS.agents, 1, 64);
        cfg.maxAgents = Math.max(cfg.agents, Math.round(cfg.maxAgents) || DEFAULTS.maxAgents);
        cfg.speed = clamp(Math.round(cfg.speed) || 1, 1, 3);
        if (!Array.isArray(cfg.names)) cfg.names = DEFAULTS.names;

        if (cfg.fromTop) window.scrollTo({ top: 0, behavior: 'instant' });

        const style = document.createElement('style');
        style.id = 'das-style';
        style.textContent = CSS;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = ROOT_ID;
        document.documentElement.appendChild(root);

        S = {
            cfg, root, style, token: Symbol('run'), layers: [], agents: [], selections: new Set(),
            built: 0, cursor: 0, spawned: 0, finished: false, bar: null, lastBar: 0, tourTo: null, screenDoneAt: 0,
            last: performance.now(), lastScrollY: window.scrollY, scrollSpeed: 0, spawnCooldown: 0,
        };

        S.layers = collect();
        hideAll(S.layers);
        refreshPositions();
        if (cfg.toolbar) buildBar();
        for (let i = 0; i < cfg.agents; i++) setTimeout(() => S && spawnAgent(false), 500 + i * 70);
        syncLauncher();
        S.refreshTimer = setInterval(() => S && refreshPositions(), 1500);
        S.tourTimer = setInterval(tourTick, 450);
        window.addEventListener('keydown', onKey, true);
        schedule();
        updateBar(true);
    }

    function stop() {
        if (!S) return;
        const s = S;
        S = null;
        cancelAnimationFrame(s.raf);
        clearTimeout(s.tick);
        clearInterval(s.refreshTimer);
        clearInterval(s.tourTimer);
        window.removeEventListener('keydown', onKey, true);
        for (const a of s.agents) {
            if (a.arrive) a.arrive.reject(STOPPED);
        }
        for (const L of s.layers) {
            if (L.type === 'text') {
                if (L.wrap && L.wrap.parentNode) L.wrap.replaceWith(L.node);
            } else {
                unmark(L, 'das-mh', 'das-bh', 'das-fade');
            }
        }
        s.root.remove();
        s.style.remove();
        syncLauncher();
    }

    let launcher = null;
    function syncLauncher() {
        if (launcher) launcher.style.display = S ? 'none' : '';
    }

    window.DASwarm = {
        start,
        stop,
        isRunning: () => !!S,
        defaults: { ...DEFAULTS },
        // For debugging: a snapshot of what the swarm sees.
        inspect: () =>
            S && {
                built: S.built,
                total: S.layers.length,
                agents: S.agents.length,
                scrollY: window.scrollY,
                layers: S.layers.map((L) => ({ type: L.type, state: L.state, pageY: Math.round(L.pageY), h: Math.round(L.h), text: L.type === 'text' ? L.node.nodeValue.trim().slice(0, 24) : L.el.tagName })),
            },
    };

    // ── Auto-start ─────────────────────────────────────────────────────────────
    // Add the script to a site once. It does nothing for normal visitors; it runs when
    // the page URL has ?swarm (e.g. ?swarm&tour=1&agents=24&speed=2). Settings can also
    // be set on the script tag: data-agents, data-speed, data-tour, data-names,
    // data-delay, data-labels, data-toolbar, data-from-top, data-trigger.
    //   data-trigger="query"  (default) start only when the URL has ?swarm
    //   data-trigger="always" start on every page load (demos only)
    //   data-trigger="manual" never start by itself; call DASwarm.start()
    const script = document.currentScript;

    function readConfig() {
        const cfg = {};
        const ds = (script && script.dataset) || {};
        const params = new URLSearchParams(window.location.search);
        const pick = (key, attr) => (params.has(key) ? params.get(key) : ds[attr ?? key]);
        const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
        const bool = (v) => (v === undefined || v === null ? undefined : !/^(0|false|no|off)$/i.test(v));
        const set = (k, v) => {
            if (v !== undefined && !Number.isNaN(v)) cfg[k] = v;
        };
        set('agents', num(pick('agents')));
        set('maxAgents', num(pick('max', 'maxAgents')));
        set('speed', num(pick('speed')));
        set('tour', bool(pick('tour')));
        set('labels', bool(pick('labels')));
        set('toolbar', bool(pick('toolbar')));
        set('fromTop', bool(pick('top', 'fromTop')));
        const names = pick('names');
        if (names) cfg.names = names.split(',').map((n) => n.trim()).filter(Boolean);
        return { cfg, delay: num(pick('delay')) || 0, trigger: ds.trigger || 'query', params };
    }

    // Alt+Shift+S toggles the swarm on any page with the script (data-shortcut="false"
    // turns this off). Ignored while typing in a field.
    function installShortcut() {
        const ds = (script && script.dataset) || {};
        if (/^(0|false|no|off)$/i.test(ds.shortcut || '')) return;
        window.addEventListener('keydown', (e) => {
            if (!(e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyS')) return;
            const t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            e.preventDefault();
            if (S) stop();
            else start(readConfig().cfg);
        });
    }

    // On-page toggles:
    //  • any element with data-swarm-toggle (e.g. a button in the site's own footer)
    //  • data-button="true" on the script tag adds a small floating launcher
    function installToggles() {
        document.addEventListener('click', (e) => {
            const el = e.target instanceof Element && e.target.closest('[data-swarm-toggle]');
            if (!el) return;
            e.preventDefault();
            if (S) stop();
            else start(readConfig().cfg);
        });
        const ds = (script && script.dataset) || {};
        if (!/^(1|true|yes|on)$/i.test(ds.button || '')) return;
        const mount = () => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-swarm-toggle', '');
            btn.setAttribute('data-swarm-skip', '');
            btn.setAttribute('aria-label', 'Watch this page get built by AI agents');
            btn.textContent = ds.buttonLabel || 'Watch it build';
            btn.style.cssText = [
                'position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147483645', 'cursor:pointer',
                'border:0', 'border-radius:999px', 'padding:10px 16px 10px 14px', 'color:#fff',
                'font:700 13px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
                'background:linear-gradient(90deg,#f64e6e,#ff795e)', 'box-shadow:0 8px 24px rgba(246,78,110,.35)',
            ].join(';');
            btn.prepend(Object.assign(document.createElement('span'), { textContent: '▶ ', style: 'font-size:10px' }));
            document.body.appendChild(btn);
            // Hidden while the swarm runs; the toolbar has its own controls.
            launcher = btn;
            syncLauncher();
        };
        if (document.body) mount();
        else document.addEventListener('DOMContentLoaded', mount, { once: true });
    }

    function autoStart() {
        const { cfg, delay, trigger, params } = readConfig();
        const requested = params.has('swarm') && !/^(0|false|off)$/i.test(params.get('swarm') || '');
        if (trigger === 'manual') return;
        if (trigger !== 'always' && !requested) return;
        const go = () => setTimeout(() => start(cfg), delay);
        if (document.readyState === 'complete') go();
        else window.addEventListener('load', go, { once: true });
    }

    installShortcut();
    installToggles();
    autoStart();
})();
