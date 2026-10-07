import data from './data/github.json';
import { LINKS } from './config';

/**
 * The app repo's star count and latest release, as committed to
 * `src/data/github.json` by `scripts/refresh-github-data.mjs`. Reading a file
 * rather than the API means visitors never call GitHub, the CSP stays as it is,
 * and a build cannot ship without a number because GitHub was slow. The numbers
 * are as fresh as the last refresh: hourly for a release, daily for stars.
 */
export const STARS: number = data.stars;

/** The latest published release, e.g. `v1.12.3`, and its release notes. */
export const RELEASE = {
	tag: data.release,
	url: `${LINKS.releases}/tag/${data.release}`
};

export function formatStars(count: number): string {
	if (count < 1000) return String(count);
	const k = count / 1000;
	return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
}
