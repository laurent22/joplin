"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = exports.EventName = void 0;
const fastDeepEqual = require('fast-deep-equal');
const events_1 = require("events");
var EventName;
(function (EventName) {
    EventName["ResourceCreate"] = "resourceCreate";
    EventName["ResourceChange"] = "resourceChange";
    EventName["SettingsChange"] = "settingsChange";
    EventName["TodoToggle"] = "todoToggle";
    EventName["SyncStart"] = "syncStart";
    EventName["SessionEstablished"] = "sessionEstablished";
    EventName["SyncComplete"] = "syncComplete";
    EventName["ItemChange"] = "itemChange";
    EventName["NoteAlarmTrigger"] = "noteAlarmTrigger";
    EventName["AlarmChange"] = "alarmChange";
    EventName["KeymapChange"] = "keymapChange";
    EventName["NoteContentChange"] = "noteContentChange";
    EventName["OcrServiceResourcesProcessed"] = "ocrServiceResourcesProcessed";
    EventName["NoteResourceIndexed"] = "noteResourceIndexed";
    EventName["WindowOpen"] = "windowOpen";
    EventName["WindowClose"] = "windowClose";
})(EventName || (exports.EventName = EventName = {}));
class EventManager {
    constructor() {
        this.reset();
    }
    reset() {
        this.emitter_ = new events_1.EventEmitter();
        this.appStatePrevious_ = {};
        this.appStateWatchedProps_ = [];
        this.appStateListeners_ = {};
    }
    on(eventName, callback) {
        return this.emitter_.on(eventName, callback);
    }
    emit(eventName, ...args) {
        return this.emitter_.emit(eventName, ...args);
    }
    removeListener(eventName, callback) {
        return this.emitter_.removeListener(eventName, callback);
    }
    off(eventName, callback) {
        return this.removeListener(eventName, callback);
    }
    filterOn(filterName, callback) {
        return this.emitter_.on(`filter:${filterName}`, callback);
    }
    filterOff(filterName, callback) {
        return this.emitter_.off(`filter:${filterName}`, callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async filterEmit(filterName, object) {
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
            }
            catch (error) {
                error.message = `Error in listener when calling: ${filterName}: ${error.message}`;
                throw error;
            }
            // Plugin didn't return anything - so we leave the object as it is.
            if (newOutput === undefined)
                continue;
            if (!fastDeepEqual(newOutput, output)) {
                output = newOutput;
            }
        }
        return output;
    }
    appStateOn(propName, callback) {
        if (!this.appStateListeners_[propName]) {
            this.appStateListeners_[propName] = [];
            this.appStateWatchedProps_.push(propName);
        }
        this.appStateListeners_[propName].push(callback);
    }
    appStateOff(propName, callback) {
        if (!this.appStateListeners_[propName]) {
            throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (1)');
        }
        const idx = this.appStateListeners_[propName].indexOf(callback);
        if (idx < 0)
            throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (2)');
        this.appStateListeners_[propName].splice(idx, 1);
    }
    stateValue_(state, propName) {
        const parts = propName.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code from before rule was applied.
        let s = state;
        for (const p of parts) {
            if (!(p in s))
                throw new Error(`Invalid state property path: ${propName}`);
            s = s[p];
        }
        return s;
    }
    // This function works by keeping a copy of the watched props and, whenever this function
    // is called, comparing the previous and new values and emitting events if they have changed.
    // The appStateEmit function should be called from a middleware.
    appStateEmit(state) {
        if (!this.appStateWatchedProps_.length)
            return;
        for (const propName of this.appStateWatchedProps_) {
            let emit = false;
            const stateValue = this.stateValue_(state, propName);
            if (!(propName in this.appStatePrevious_) || this.appStatePrevious_[propName] !== stateValue) {
                this.appStatePrevious_[propName] = stateValue;
                emit = true;
            }
            if (emit) {
                const listeners = this.appStateListeners_[propName];
                if (!listeners || !listeners.length)
                    continue;
                const eventValue = Object.freeze(stateValue);
                for (const listener of listeners) {
                    listener({ value: eventValue });
                }
            }
        }
    }
    once(eventName, callback) {
        return this.emitter_.once(eventName, callback);
    }
    // For testing only; only applies to listeners registered with .on.
    listenerCounter_(event) {
        const initialListeners = this.emitter_.listeners(event);
        return {
            getCountRemoved: () => {
                const currentListeners = this.emitter_.listeners(event);
                let countRemoved = 0;
                for (const listener of initialListeners) {
                    if (!currentListeners.includes(listener)) {
                        countRemoved++;
                    }
                }
                return countRemoved;
            },
        };
    }
}
exports.EventManager = EventManager;
const eventManager = new EventManager();
exports.default = eventManager;
