const prettyBytes = require('pretty-bytes');

export const KB = 1024;
export const MB = KB * KB;
export const GB = KB * MB;

export function formatBytes(bytes: number): string {
	// To simplify we display the result with SI prefix, but removes the "i".
	// So 1024 bytes = 1 kB (and not 1 kiB)
	return prettyBytes(bytes, { binary: true }).replace(/i/g, '');
}
