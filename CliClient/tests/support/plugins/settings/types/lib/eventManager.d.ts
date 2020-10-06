declare class EventManager {
    private emitter_;
    private appStatePrevious_;
    private appStateWatchedProps_;
    private appStateListeners_;
    constructor();
    reset(): void;
    on(eventName: string, callback: Function): any;
    emit(eventName: string, object?: any): any;
    removeListener(eventName: string, callback: Function): any;
    off(eventName: string, callback: Function): any;
    filterOn(filterName: string, callback: Function): any;
    filterOff(filterName: string, callback: Function): any;
    filterEmit(filterName: string, object: any): any;
    appStateOn(propName: string, callback: Function): void;
    appStateOff(propName: string, callback: Function): void;
    stateValue_(state: any, propName: string): any;
    appStateEmit(state: any): void;
}
declare const eventManager: EventManager;
export default eventManager;
