/**
 * Draws the social card at public/og.png.
 *
 *     node scripts/make-og.mjs
 *
 * A script rather than a built route, so the site ships exactly one page and
 * re-running it is a one-liner when the headline changes.
 *
 * The card is the top of the homepage with the app mock left out: the same
 * off-white page, the same two soft stone glows, the same type. It is centred
 * and text-only on purpose — it gets seen at roughly 500px wide in a timeline,
 * so a cropped screenshot underneath would read as noise, not as product.
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/og.png');

// Palette and type lifted from src/styles/global.css and Hero.astro. Keep the
// two headline lines together — they are the hero's <br>, and both are measured
// to fit without wrapping at 1200px.
const html = /* html */ `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<style>
			* { box-sizing: border-box; margin: 0; }
			body {
				width: 1200px; height: 630px; overflow: hidden;
				background: #fafaf9; color: #0c0c0e;
				font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
				-webkit-font-smoothing: antialiased;
				position: relative;
				display: flex; flex-direction: column;
				align-items: center; justify-content: center;
				padding: 64px 64px 76px;
				text-align: center;
			}

			/* The hero's two blurred stone blobs, same sizes and offsets. */
			.glow { position: absolute; border-radius: 9999px; background: rgba(231, 229, 228, .5); filter: blur(64px); pointer-events: none; }
			.glow.a { width: 820px; height: 420px; top: -160px; left: 50%; margin-left: -410px; }
			.glow.b { width: 320px; height: 260px; top: 120px; left: 10%; background: rgba(231, 229, 228, .4); }

			main { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }

			.brand { display: flex; align-items: center; gap: 15px; }
			.brand span { font-size: 27px; font-weight: 800; letter-spacing: -.02em; }

			h1 {
				margin-top: 34px;
				font-size: 50px; line-height: 1.12; font-weight: 800; letter-spacing: -.03em;
				white-space: nowrap;
			}
			h1 span { color: #78716c; }

			.platforms { margin-top: 22px; font-size: 22px; line-height: 1.4; font-weight: 500; color: #78716c; }

			footer {
				position: absolute; z-index: 1; left: 0; right: 0; bottom: 56px;
				display: flex; align-items: center; justify-content: center; gap: 16px;
			}
			.pill {
				display: inline-flex; align-items: center; height: 34px; padding: 0 15px;
				border-radius: 9999px; border: 1px solid rgba(231, 229, 228, .9); background: rgba(255, 255, 255, .7);
				box-shadow: 0 4px 20px -8px rgb(28 25 23 / .08);
				font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #57534e;
			}
			.domain { font-size: 16px; font-weight: 700; color: #a8a29e; }
		</style>
	</head>
	<body>
		<div class="glow a"></div>
		<div class="glow b"></div>

		<main>
			<div class="brand">
				<svg width="46" height="46" viewBox="0 0 64 64">
					<rect width="64" height="64" rx="15" fill="#0c0c0e"></rect>
					<path d="M23.32 19.77A2 2 0 0 0 24.15 18.35L24.48 15.39A3.5 3.5 0 0 1 27.96 12.27L36.04 12.27A3.5 3.5 0 0 1 39.52 15.39L39.85 18.35A2 2 0 0 0 40.68 19.77A15 15 0 0 1 44.23 23.32A2 2 0 0 0 45.65 24.15L48.61 24.48A3.5 3.5 0 0 1 51.73 27.96L51.73 36.04A3.5 3.5 0 0 1 48.61 39.52L45.65 39.85A2 2 0 0 0 44.23 40.68A15 15 0 0 1 40.68 44.23A2 2 0 0 0 39.85 45.65L39.52 48.61A3.5 3.5 0 0 1 36.04 51.73L27.96 51.73A3.5 3.5 0 0 1 24.48 48.61L24.15 45.65A2 2 0 0 0 23.32 44.23A15 15 0 0 1 19.77 40.68A2 2 0 0 0 18.35 39.85L15.39 39.52A3.5 3.5 0 0 1 12.27 36.04L12.27 27.96A3.5 3.5 0 0 1 15.39 24.48L18.35 24.15A2 2 0 0 0 19.77 23.32A15 15 0 0 1 23.32 19.77Z M32 32m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0" fill="#ffffff" fill-rule="evenodd"></path>
				</svg>
				<span>CogSend</span>
			</div>

			<h1>Your self-hosted social scheduler,<br /><span>on your own Cloudflare account.</span></h1>

			<p class="platforms">Mastodon, Bluesky, LinkedIn, Threads, Instagram and X.</p>
		</main>

		<footer>
			<span class="pill">Self-hosted &middot; MIT licensed</span>
			<span class="domain">cogsend.com</span>
		</footer>
	</body>
</html>
`;

const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width: 1200, height: 630 },
	deviceScaleFactor: 1
});
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(300);

// The failure modes that are invisible at 1200px and obvious at 500px: a
// headline that wrapped, or a footer that collided with the platform line.
const check = await page.evaluate(() => {
	const body = document.body.getBoundingClientRect();
	const h1 = document.querySelector('h1').getBoundingClientRect();
	const platforms = document.querySelector('.platforms').getBoundingClientRect();
	const footer = document.querySelector('footer').getBoundingClientRect();
	return {
		headlineLines: Math.round(h1.height / parseFloat(getComputedStyle(document.querySelector('h1')).lineHeight)),
		headlineWidth: Math.round(h1.width),
		headlineOverflows: h1.width > body.width - 128 || h1.left < 0 || h1.right > body.width,
		footerOverlaps: platforms.bottom > footer.top - 8
	};
});
if (check.headlineOverflows) throw new Error(`headline does not fit on one line: ${JSON.stringify(check)}`);
if (check.headlineLines !== 2) throw new Error(`headline should be 2 lines, got ${check.headlineLines}`);
if (check.footerOverlaps) throw new Error(`footer collides with the copy: ${JSON.stringify(check)}`);

await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`, check);
