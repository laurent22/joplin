import { Point2, Vec2 } from './geometry/Vec2';
import Viewport from './Viewport';

export enum PointerDevice {
	Pen,
	Touch,
	Mouse,
	Other,
}

// Provides a snapshot containing information about a pointer. A Pointer
// object is immutable --- it will not be updated when the pointer's information changes.
export default class Pointer {
	private constructor(
        // The (x, y) position of the pointer relative to the top-left corner
        // of the visible canvas.
        public readonly screenPos: Point2,

        // Position of the pointer relative to the top left corner of the drawing
        // surface.
        public readonly canvasPos: Point2,

        public readonly pressure: number|null,
        public readonly isPrimary: boolean,
        public readonly down: boolean,

        public readonly device: PointerDevice,

        // Unique ID for the pointer
        public readonly id: number,

        // Numeric timestamp (milliseconds, as from (new Date).getTime())
        public readonly timeStamp: number
	) {
	}

	public static ofEvent(evt: PointerEvent, isDown: boolean, viewport: Viewport): Pointer {
		const screenPos = Vec2.of(evt.clientX, evt.clientY);

		const pointerTypeToDevice: Record<string, PointerDevice> = {
			'mouse': PointerDevice.Mouse,
			'pen': PointerDevice.Pen,
			'touch': PointerDevice.Touch,
		};
		const device = pointerTypeToDevice[evt.pointerType] ?? PointerDevice.Other;

		const timeStamp = (new Date()).getTime();
		const canvasPos = viewport.screenToCanvas(screenPos);

		return new Pointer(
			screenPos,
			canvasPos,
			evt.pressure ?? null,
			evt.isPrimary,
			isDown,
			device,
			evt.pointerId,
			timeStamp
		);
	}

	// Create a new Pointer from a point on the canvas.
	// Intended for unit tests.
	public static ofCanvasPoint(
		canvasPos: Point2,
		isDown: boolean,
		viewport: Viewport,
		id: number = 0,
		device: PointerDevice = PointerDevice.Pen,
		isPrimary: boolean = true,
		pressure: number|null = null
	): Pointer {
		const screenPos = viewport.canvasToScreen(canvasPos);
		const timeStamp = (new Date()).getTime();

		return new Pointer(
			screenPos,
			canvasPos,
			pressure,
			isPrimary,
			isDown,
			device,
			id,
			timeStamp
		);
	}
}
