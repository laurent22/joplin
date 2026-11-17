// Small module used to tell the navigator that the next note screen has been opened from
// a card of the notes grid, so that it can be animated as a zoom starting from that card.

export interface TransitionOrigin {
	// Centre of the pressed card, in window coordinates
	x: number;
	y: number;
}

let pendingOrigin_: TransitionOrigin|null = null;

export const requestNoteOpenTransition = (origin: TransitionOrigin) => {
	pendingOrigin_ = origin;
};

// Returns the pending origin, if any, and clears it so that it is only used once.
export const consumeNoteOpenTransition = () => {
	const origin = pendingOrigin_;
	pendingOrigin_ = null;
	return origin;
};

export const clearNoteOpenTransition = () => {
	pendingOrigin_ = null;
};

export const noteOpenTransitionDuration = 250;

const startScale = 0.4;

// Transform that makes the screen appear to grow from `origin`. `progress` goes from 0 to 1.
export const getZoomTransform = (progress: number, origin: TransitionOrigin, screenWidth: number, screenHeight: number) => {
	const scale = startScale + (1 - startScale) * progress;
	// Scaling happens around the screen centre, so translate to keep `origin` fixed at the start.
	return {
		scale,
		translateX: (origin.x - screenWidth / 2) * (1 - scale),
		translateY: (origin.y - screenHeight / 2) * (1 - scale),
	};
};
