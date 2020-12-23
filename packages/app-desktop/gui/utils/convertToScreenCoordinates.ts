// Converts world coordinate to screen coordinates by applying the current
// zoom.
export default function convertToScreenCoordinates(o: any): any {
	const pixelRatio = window.devicePixelRatio;

	if (typeof o === 'number') return o * pixelRatio;

	if (typeof o === 'object' && o !== null) {
		o = JSON.parse(JSON.stringify(o));
		console.info('K', Object.keys(o));
		for (const k of Object.keys(o)) {
			o[k] = convertToScreenCoordinates(o[k]);
		}
		return o;
	}

	throw new Error(`Cannot convert to screen coordinates: ${typeof o}`);
}
