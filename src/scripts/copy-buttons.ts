// Every [data-copy] button on a page shares this one listener, delegated from
// document, so a button added later by another component keeps working. A
// component with such a button imports this file from its own <script>, since
// Astro only bundles a component's script on pages that render it.
document.addEventListener('click', async (event) => {
	const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-copy]');
	if (!button) return;
	const value = button.dataset.copy ?? '';
	try {
		await navigator.clipboard.writeText(value);
	} catch {
		// Clipboard access needs a secure context and a user gesture, which a
		// plain-http localhost run in an odd browser can still refuse. Select
		// the text instead, so the copy is one keystroke away.
		const text = button.parentElement?.querySelector('code, pre');
		if (text) {
			const range = document.createRange();
			range.selectNodeContents(text);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
		return;
	}
	button.dataset.copied = '';
	window.setTimeout(() => delete button.dataset.copied, 2000);
});
