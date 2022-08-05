/**
 * Types relevant to the image editor
 */

import EventDispatcher from '@joplin/lib/EventDispatcher';
import { ImageComponent } from 'react-native';
import Mat33 from './geometry/Mat33';
import { Point2, Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import BaseTool from './tools/BaseTool';

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

export interface PointerEvtListener {
	/**
	 * @param current The pointer that triggered the event
	 * @param allPointers A list of all pointers that are down
	 * @return true to capture the event, canceling any in-progress gestures.
	 *         false to not receive `pointerMove`/`pointerUp` events for the gesture
	 *         until another call to `onPointerDown` returns `true`.
	 */
	onPointerDown(event: PointerEvt): boolean;
	onPointerMove(event: PointerEvt): void;
	onPointerUp(event: PointerEvt): void;

	/**
	 * Called if a pointer that has been captured by this listener (by returning
	 * `true` from `onPointerDown`) is re-captured by another listener.
	 *
	 * When called, this method should cancel any changes being made by the current
	 * gesture.
	 *
	 * @see onPointerDown
	 * @see GestureCancelEvt
	 */
	onGestureCancel(): void;
}

export enum InputEvtType {
	PointerDownEvt,
	PointerMoveEvt,
	PointerUpEvt,
	GestureCancelEvt,

	WheelEvt,
}

/**
 * A mouse wheel event.
 * [delta.x] is horizontal scroll,
 * [delta.y] is vertical scroll,
 * [delta.z] is zoom scroll (ctrl+scroll or pinch zoom)
 */
export interface WheelEvt  {
	readonly kind: InputEvtType.WheelEvt;
	readonly delta: Vec3;
	readonly screenPos: Point2;
}

/**
 * Event triggered when pointer capture is taken by a different [PointerEvtListener].
 * @see PointerEvtListener.onGestureCancel
 */
export interface GestureCancelEvt  {
	readonly kind: InputEvtType.GestureCancelEvt;
}

/**
 * Base class for all PointerEvts
 */
interface PointerEvtBase  {
	readonly current: Pointer;
	readonly allPointers: Pointer[];
}

export interface PointerDownEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerDownEvt;
}

export interface PointerMoveEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerMoveEvt;
}

export interface PointerUpEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerUpEvt;
}

// Structuring events like this allows us to use TypeScript to ensure all
// types of InputEvt/PointerEvt are handled.
// See https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
export type PointerEvt = PointerDownEvt | PointerMoveEvt | PointerUpEvt;
export type InputEvt = WheelEvt | GestureCancelEvt | PointerEvt;

export type EditorNotifier = EventDispatcher<EditorEventType, EditorEventDataType>;

export enum EditorEventType {
	ToolEnabled,
	ToolDisabled,
	ToolUpdated,
	ObjectAdded,
	ViewportChanged,
	DisplayResized,
};

type EditorToolEventType = EditorEventType.ToolEnabled
	| EditorEventType.ToolDisabled
	| EditorEventType.ToolUpdated;
export interface EditorToolEvent {
	readonly kind: EditorToolEventType;
	readonly tool: BaseTool;
}

export interface EditorObjectEvent {
	readonly kind: EditorEventType.ObjectAdded;
	readonly object: ImageComponent;
}

export interface EditorViewportChangedEvent {
	readonly kind: EditorEventType.ViewportChanged;

	// Canvas -> screen transform
	readonly newTransform: Mat33;
}

export interface DisplayResizedEvent {
	readonly kind: EditorEventType.DisplayResized;
	readonly newSize: Vec2;
}

export type EditorEventDataType = EditorToolEvent | EditorObjectEvent | EditorViewportChangedEvent | DisplayResizedEvent;
