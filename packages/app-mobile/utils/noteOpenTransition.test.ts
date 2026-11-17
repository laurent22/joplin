import { consumeNoteOpenTransition, getZoomTransform, requestNoteOpenTransition } from './noteOpenTransition';

describe('noteOpenTransition', () => {
	test('the pending origin should only be consumed once', () => {
		expect(consumeNoteOpenTransition()).toBe(null);
		requestNoteOpenTransition({ x: 10, y: 20 });
		expect(consumeNoteOpenTransition()).toEqual({ x: 10, y: 20 });
		expect(consumeNoteOpenTransition()).toBe(null);
	});

	test('the zoom transform should end at the identity', () => {
		const end = getZoomTransform(1, { x: 50, y: 60 }, 400, 800);
		expect(end.scale).toBe(1);
		expect(end.translateX).toBeCloseTo(0);
		expect(end.translateY).toBeCloseTo(0);
		const start = getZoomTransform(0, { x: 50, y: 60 }, 400, 800);
		expect(start.scale).toBeLessThan(1);
		expect(start.translateX).toBeLessThan(0);
	});
});
