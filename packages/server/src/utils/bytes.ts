const prettyBytes = require('pretty-bytes');

export const KB = 1024;
export const MB = KB * KB;
export const GB = KB * MB;

export function formatBytes(bytes: number): string {
	// To simplify we display the result with SI prefix, but removes the "i".
	// So 1024 bytes = 1 kB (and not 1 kiB)
	return prettyBytes(bytes, { binary: true }).replace(/i/g, '');
}

// `prettyBytes` is possibly making the server freeze when used to log content length so trying with
// a simpler function
export const formatBytesSimple = (bytes: number) => {
	if (bytes < 1000) {
		return `${bytes} B`;
	} else if (bytes < 1000 * 1000) {
		return `${(bytes / 1000).toFixed(1)} kB`;
	} else {
		return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
	}
};
