// Converts world coordinate to screen coordinates by applying the current
// zoom. `windowContentZoomFactor` is the setting value.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function convertToScreenCoordinates(windowContentZoomFactor: number, o: any): any {
	const percent = windowContentZoomFactor / 100;

	if (typeof o === 'number') return o * percent;

	if (typeof o === 'object' && o !== null) {
		o = JSON.parse(JSON.stringify(o));
		for (const k of Object.keys(o)) {
			o[k] = convertToScreenCoordinates(windowContentZoomFactor, o[k]);
		}
		return o;
	}

	throw new Error(`Cannot convert to screen coordinates: ${typeof o}`);
}
