/**
 * Types relevant to the image editor
 */

import { Point2 } from './math';
import { ImageEditor } from './editor';

/**
 * Provides a snapshot containing information about a pointer. A Pointer
 * object is immutable --- it will not be updated when the pointer's information changes.
 */
export interface Pointer {
	/**
	 * The (x, y) position of the pointer relative to the top-left corner
	 * of the visible canvas.
	 */
	readonly screenPos: Point2;

	/**
	 * Position of the pointer relative to the top left corner of the drawing
	 * surface.
	 */
	readonly canvasPos: Point2;

	readonly pressure?: number;
	readonly isPrimary: boolean;
	readonly down: boolean;

	readonly device: PointerDevice;

	/** Unique ID for the pointer */
	readonly id: number;

	/** Numeric timestamp {@see event.timeStamp} */
	readonly timeStamp: number;
}

export enum PointerDevice {
	Pen,
	Touch,
	Mouse,
	Other,
}

export interface PointerEventListener {
	/**
	 * @param current The pointer that triggered the event
	 * @param allPointers A list of all pointers that are down
	 * @return true to capture the event, canceling any in-progress gestures.
	 *         false to not receive `pointerMove`/`pointerUp` events for the gesture
	 *         until another call to `onPointerDown` returns `true`.
	 */
	onPointerDown(current: Pointer, allPointers: Pointer[]): boolean;
	onPointerMove(current: Pointer, allPointers: Pointer[]): void;
	onPointerUp(pointer: Pointer, allPointers: Pointer[]): void;

	/**
	 * Called if a pointer that has been captured by this listener (by returning
	 * `true` from `onPointerDown`) is re-captured by another listener.
	 *
	 * When called, this method should cancel any changes being made by the current
	 * gesture.
	 *
	 * @see onPointerDown
	 */
	onGestureCancel(): void;
}

export interface Command {
	apply(editor: ImageEditor): void;
	unapply(editor: ImageEditor): void;
}

