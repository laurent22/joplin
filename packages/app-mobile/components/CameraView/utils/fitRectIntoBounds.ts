export interface Rect {
	width: number;
	height: number;
}

const fitRectIntoBounds = (rect: Rect, bounds: Rect) => {
	const rectRatio = rect.width / rect.height;
	const boundsRatio = bounds.width / bounds.height;

	const newDimensions: Rect = { width: 0, height: 0 };

	// Rect is more landscape than bounds - fit to width
	if (rectRatio > boundsRatio) {
		newDimensions.width = bounds.width;
		newDimensions.height = rect.height * (bounds.width / rect.width);
	} else { // Rect is more portrait than bounds - fit to height
		newDimensions.width = rect.width * (bounds.height / rect.height);
		newDimensions.height = bounds.height;
	}

	return newDimensions;
};

export default fitRectIntoBounds;
