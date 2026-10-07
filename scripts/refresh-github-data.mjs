#!/usr/bin/env node
/**
 * Writes `src/data/github.json`: the app repo's star count, its latest release,
 * and the last commit on main that touched `docs/`.
 *
 *     node scripts/refresh-github-data.mjs            # release and docs; stars only alongside them
 *     node scripts/refresh-github-data.mjs --stars    # all three
 *
 * The header reads the stars and the release, and `scripts/sync-docs.mjs` reads
 * the docs at that commit, so a build never calls the GitHub API, cannot ship
 * without a number, and builds the same docs every time. This script is the
 * only thing that changes the file, run hourly by
 * `.github/workflows/refresh-github-data.yml`, which commits it when it
 * changes; the push is what deploys.
 *
 * The docs follow main, not the release, because the install command clones
 * main. Only commits to `docs/` count, so the many app commits that do not
 * touch the manual do not each cost a deploy.
 *
 * A new release or a docs edit is worth a deploy within the hour. A new star is
 * not, and every commit is a Cloudflare Pages build, so without `--stars` the
 * count is only refreshed when something else changed anyway. The workflow
 * passes `--stars` once a day.
 *
 * Every failure is fatal and leaves the file untouched: a bad answer from GitHub
 * should keep the last good numbers on the site, not replace them.
 *
 * GITHUB_TOKEN is optional. Without it the API allows 60 requests an hour per
 * IP, which is plenty from a laptop and unreliable from a shared CI runner.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(root, 'src/data/github.json');

const REPO = 'deepakness/cogsend';
const API = `https://api.github.com/repos/${REPO}`;

/**
 * The tag becomes a URL in the header and the sha a git ref in the docs sync;
 * both go into a commit message. Anything that is not the expected shape is
 * refused rather than passed on.
 */
const TAG = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA = /^[0-9a-f]{40}$/;

const STARS = process.argv.includes('--stars');

async function get(path) {
	const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(15_000) });
	if (!res.ok) throw new Error(`GET ${API}${path} answered ${res.status}.`);
	return res.json();
}

function read() {
	try {
		return JSON.parse(readFileSync(FILE, 'utf8'));
	} catch {
		return null;
	}
}

const before = read();

const { tag_name: release } = await get('/releases/latest');
if (typeof release !== 'string' || !TAG.test(release)) {
	throw new Error(`The latest release is tagged ${JSON.stringify(release)}, which is not a version.`);
}

const [latest] = await get('/commits?sha=main&path=docs&per_page=1');
const docs = latest?.sha;
if (typeof docs !== 'string' || !SHA.test(docs)) {
	throw new Error(`The last docs commit came back as ${JSON.stringify(docs)}.`);
}

const releaseChanged = release !== before?.release;
const docsChanged = docs !== before?.docs;

let stars = before?.stars;
if (STARS || releaseChanged || docsChanged || typeof stars !== 'number') {
	const { stargazers_count } = await get('');
	if (!Number.isInteger(stargazers_count) || stargazers_count < 0) {
		throw new Error(`The star count came back as ${JSON.stringify(stargazers_count)}.`);
	}
	stars = stargazers_count;
}

const after = { stars, release, docs };
const changed = JSON.stringify(after) !== JSON.stringify(before);
if (changed) writeFileSync(FILE, `${JSON.stringify(after, null, '\t')}\n`);

const describe = (d) => `${d.release}, ${d.stars} stars, docs at ${String(d.docs).slice(0, 7)}`;
const summary = describe(after);
const was = before ? describe(before) : 'nothing';
console.log(changed ? `GitHub data: ${summary}, was ${was}.` : `GitHub data: unchanged, ${summary}.`);

// For the workflow: whether to commit, and whether the docs moved.
if (process.env.GITHUB_OUTPUT) {
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		`changed=${changed}\ndocs_changed=${docsChanged}\nsummary=${summary}\n`
	);
}
