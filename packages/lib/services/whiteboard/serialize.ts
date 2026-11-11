import { Canvas, fenceTag } from './jsoncanvas';
import { parseWhiteboard } from './parse';

const stringifyCanvas = (canvas: Canvas): string => {
	// Pretty-print so manual diffs are usable. The cost is bigger note bodies,
	// but JSONCanvas files are small in practice and Joplin's note storage
	// handles this fine.
	return JSON.stringify(canvas, null, '\t');
};

const buildFencedBlock = (canvas: Canvas): string => {
	return `\`\`\`${fenceTag}\n${stringifyCanvas(canvas)}\n\`\`\``;
};

// Replace the first jsoncanvas fence in `body` with one carrying `canvas`.
// If no fence exists, append one (preceded by a blank line if the existing
// body is non-empty).
export const serializeWhiteboard = (body: string, canvas: Canvas): string => {
	const block = buildFencedBlock(canvas);
	const result = parseWhiteboard(body);

	if (result.hasCanvas || (result.prefix !== body)) {
		// A fence was found (or matched but invalid). Replace it in place.
		const prefix = result.prefix;
		const suffix = result.suffix;
		// Re-glue: prefix + block + (newline if suffix exists) + suffix.
		if (suffix.length > 0) {
			return `${prefix}${block}\n${suffix}`;
		}
		return `${prefix}${block}`;
	}

	// No fence yet: append.
	if (!body) return block;
	const sep = body.endsWith('\n') ? '\n' : '\n\n';
	return `${body}${sep}${block}`;
};

// Returns a note body that contains only an empty canvas — used by the
// "create whiteboard" command.
export const newWhiteboardBody = (): string => {
	return buildFencedBlock({ nodes: [], edges: [] });
};
