// Converts world coordinate to screen coordinates by applying the current
// zoom. `windowContentZoomFactor` is the setting value.
export default function convertToScreenCoordinates(windowContentZoomFactor: number, o: unknown): unknown {
	const percent = windowContentZoomFactor / 100;

	if (typeof o === 'number') return o * percent;

	if (typeof o === 'object' && o !== null) {
		const copy = JSON.parse(JSON.stringify(o)) as Record<string, unknown>;
		for (const k of Object.keys(copy)) {
			copy[k] = convertToScreenCoordinates(windowContentZoomFactor, copy[k]);
		}
		return copy;
	}

	throw new Error(`Cannot convert to screen coordinates: ${typeof o}`);
}
