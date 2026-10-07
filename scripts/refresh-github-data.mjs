#!/usr/bin/env node
/**
 * Writes `src/data/github.json`: the app repo's star count and latest release.
 *
 *     node scripts/refresh-github-data.mjs            # the release; stars only if it moved
 *     node scripts/refresh-github-data.mjs --stars    # the release and the stars
 *
 * The header and the docs ref read that file at build time, so a build never
 * calls the GitHub API and cannot ship without a number. This script is the
 * only thing that changes it, run hourly by
 * `.github/workflows/refresh-github-data.yml`, which commits the file when it
 * changes; the push is what deploys.
 *
 * A new release is worth a deploy within the hour. A new star is not, and every
 * commit is a Cloudflare Pages build, so without `--stars` the count is left as
 * it is unless the release moved anyway. The workflow passes `--stars` once a
 * day.
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
 * The tag becomes a git ref in the docs sync, a URL in the header and part of a
 * commit message, so anything that is not a plain version is refused.
 */
const TAG = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

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

const releaseChanged = release !== before?.release;

let stars = before?.stars;
if (STARS || releaseChanged || typeof stars !== 'number') {
	const { stargazers_count } = await get('');
	if (!Number.isInteger(stargazers_count) || stargazers_count < 0) {
		throw new Error(`The star count came back as ${JSON.stringify(stargazers_count)}.`);
	}
	stars = stargazers_count;
}

const after = { stars, release };
const changed = JSON.stringify(after) !== JSON.stringify(before);
if (changed) writeFileSync(FILE, `${JSON.stringify(after, null, '\t')}\n`);

const summary = `${release}, ${stars} stars`;
const was = before ? `${before.release}, ${before.stars} stars` : 'nothing';
console.log(changed ? `GitHub data: ${summary}, was ${was}.` : `GitHub data: unchanged, ${summary}.`);

// For the workflow: whether to commit, and whether the docs move to a new tag.
if (process.env.GITHUB_OUTPUT) {
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		`changed=${changed}\nrelease_changed=${releaseChanged}\nsummary=${summary}\n`
	);
}
