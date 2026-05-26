import * as fastDeepEqual from 'fast-deep-equal';
import { EventEmitter } from 'events';
import type { State as AppState } from './reducer';
import { ModelType } from './BaseModel';
import { NoteEntity } from './services/database/types';

export enum EventName {
	ResourceCreate = 'resourceCreate',
	ResourceChange = 'resourceChange',
	SettingsChange = 'settingsChange',
	TodoToggle = 'todoToggle',
	SyncStart = 'syncStart',
	SessionEstablished = 'sessionEstablished',
	SyncComplete = 'syncComplete',
	ItemChange = 'itemChange',
	NoteAlarmTrigger = 'noteAlarmTrigger',
	AlarmChange = 'alarmChange',
	KeymapChange = 'keymapChange',
	NoteContentChange = 'noteContentChange',
	OcrServiceResourcesProcessed = 'ocrServiceResourcesProcessed',
	NoteResourceIndexed = 'noteResourceIndexed',
	WindowOpen = 'windowOpen',
	WindowClose = 'windowClose',
}

interface ItemChangeEvent {
	itemType: ModelType;
	itemId: string;
	// Passing a changeId to Note.save causes that changeId to be included
	// in the corresponding ItemChangeEvent. This allows determining which
	// call to Note.save triggered the event.
	changeId: string;
	eventType: number;
}

interface SyncCompleteEvent {
	withErrors: boolean;
}

export interface ResourceChangeEvent {
	id: string;
}

interface NoteContentChangeEvent {
	note: NoteEntity;
}

interface NoteAlarmTriggerEvent {
	noteId: string;
}

interface SettingsChangeEvent {
	keys: string[];
}

interface AlarmChangeEvent {
	noteId: string;
	note: NoteEntity;
}

export interface WindowOpenEvent {
	windowId: string;
}

export interface WindowCloseEvent {
	windowId: string;
}

type EventArgs = {
	[EventName.ResourceCreate]: [];
	[EventName.ResourceChange]: [ResourceChangeEvent];
	[EventName.SettingsChange]: [SettingsChangeEvent];
	[EventName.TodoToggle]: [];
	[EventName.SyncStart]: [];
	[EventName.SessionEstablished]: [];
	[EventName.SyncComplete]: [SyncCompleteEvent];
	[EventName.ItemChange]: [ItemChangeEvent];
	[EventName.NoteAlarmTrigger]: [NoteAlarmTriggerEvent];
	[EventName.AlarmChange]: [AlarmChangeEvent];
	[EventName.KeymapChange]: [];
	[EventName.NoteContentChange]: [NoteContentChangeEvent];
	[EventName.OcrServiceResourcesProcessed]: [];
	[EventName.NoteResourceIndexed]: [];
	[EventName.WindowOpen]: [WindowOpenEvent];
	[EventName.WindowClose]: [WindowCloseEvent];
};

type EventListenerCallbacks = {
	[n in EventName]: (...args: EventArgs[n])=> void;
};
export type EventListenerCallback<Name extends EventName> = EventListenerCallbacks[Name];

type AppStateChangeCallback<T = unknown> = (event: { value: T })=> void;
export type FilterHandler<T = unknown> = (object: T)=> T | Promise<T>;

export class EventManager {

	private emitter_: EventEmitter;
	private appStatePrevious_: Record<string, AppState[keyof AppState]>;
	private appStateWatchedProps_: string[];
	private appStateListeners_: Record<string, AppStateChangeCallback<unknown>[]>;

	public constructor() {
		this.reset();
	}

	public reset() {
		this.emitter_ = new EventEmitter();

		this.appStatePrevious_ = {};
		this.appStateWatchedProps_ = [];
		this.appStateListeners_ = {};
	}

	public on<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		return this.emitter_.on(eventName, callback);
	}

	public emit<Name extends EventName>(eventName: Name, ...args: EventArgs[Name]) {
		return this.emitter_.emit(eventName, ...args);
	}

	public removeListener<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		return this.emitter_.removeListener(eventName, callback);
	}

	public off<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		return this.removeListener(eventName, callback);
	}

	public filterOn<T = unknown>(filterName: string, callback: FilterHandler<T>) {
		return this.emitter_.on(`filter:${filterName}`, callback as FilterHandler<unknown>);
	}

	public filterOff<T = unknown>(filterName: string, callback: FilterHandler<T>) {
		return this.emitter_.off(`filter:${filterName}`, callback as FilterHandler<unknown>);
	}

	public async filterEmit<T = unknown>(filterName: string, object: T): Promise<T> {
		let output = object;
		const listeners = this.emitter_.listeners(`filter:${filterName}`);
		for (const listener of listeners) {
			// When we pass the object to the plugin, it is always going to be
			// modified since it is serialized/unserialized. So we need to use a
			// deep equality check to see if it's been changed. Normally the
			// filter objects should be relatively small so there shouldn't be
			// much of a performance hit.
			let newOutput = null;
			try {
				newOutput = await listener(output);
			} catch (error) {
				error.message = `Error in listener when calling: ${filterName}: ${error.message}`;
				throw error;
			}

			// Plugin didn't return anything - so we leave the object as it is.
			if (newOutput === undefined) continue;

			if (!fastDeepEqual(newOutput, output)) {
				output = newOutput;
			}
		}

		return output;
	}

	public appStateOn<T = unknown>(propName: string, callback: AppStateChangeCallback<T>) {
		if (!this.appStateListeners_[propName]) {
			this.appStateListeners_[propName] = [];
			this.appStateWatchedProps_.push(propName);
		}

		this.appStateListeners_[propName].push(callback as AppStateChangeCallback<unknown>);
	}

	public appStateOff<T = unknown>(propName: string, callback: AppStateChangeCallback<T>) {
		if (!this.appStateListeners_[propName]) {
			throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (1)');
		}

		const idx = this.appStateListeners_[propName].indexOf(callback as AppStateChangeCallback<unknown>);
		if (idx < 0) throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (2)');

		this.appStateListeners_[propName].splice(idx, 1);
	}

	private stateValue_(state: AppState, propName: string) {
		const parts = propName.split('.');
		let s: Record<string, unknown> = state as unknown as Record<string, unknown>;
		for (const p of parts) {
			if (!(p in s)) throw new Error(`Invalid state property path: ${propName}`);
			s = s[p] as Record<string, unknown>;
		}
		return s;
	}

	// This function works by keeping a copy of the watched props and, whenever this function
	// is called, comparing the previous and new values and emitting events if they have changed.
	// The appStateEmit function should be called from a middleware.
	public appStateEmit(state: AppState) {
		if (!this.appStateWatchedProps_.length) return;

		for (const propName of this.appStateWatchedProps_) {
			let emit = false;

			const stateValue = this.stateValue_(state, propName);

			if (!(propName in this.appStatePrevious_) || this.appStatePrevious_[propName] !== stateValue) {
				this.appStatePrevious_[propName] = stateValue;
				emit = true;
			}

			if (emit) {
				const listeners = this.appStateListeners_[propName];
				if (!listeners || !listeners.length) continue;

				const eventValue = Object.freeze(stateValue);
				for (const listener of listeners) {
					listener({ value: eventValue });
				}
			}
		}
	}

	public once<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		return this.emitter_.once(eventName, callback);
	}

	// For testing only; only applies to listeners registered with .on.
	public listenerCounter_(event: EventName) {
		const initialListeners = this.emitter_.listeners(event);
		return {
			getCountRemoved: () => {
				const currentListeners = this.emitter_.listeners(event);
				let countRemoved = 0;
				for (const listener of initialListeners) {
					if (!currentListeners.includes(listener)) {
						countRemoved ++;
					}
				}
				return countRemoved;
			},
		};
	}
}

const eventManager = new EventManager();

export default eventManager;
