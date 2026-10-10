// 32 random bytes from your browser's own cryptographic
// generator, written as 64 hex characters: the kind of key
// `openssl rand -hex 32` prints.
export function generateKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (b) =>
		b.toString(16).padStart(2, '0')
	).join('');
}
