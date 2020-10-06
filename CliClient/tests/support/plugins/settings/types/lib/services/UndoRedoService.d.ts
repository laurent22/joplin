export default class UndoRedoService {
    private pushAsyncQueue;
    private undoStates;
    private redoStates;
    private eventEmitter;
    private isUndoing;
    constructor();
    on(eventName: string, callback: Function): any;
    off(eventName: string, callback: Function): any;
    push(state: any): void;
    schedulePush(state: any): void;
    undo(redoState: any): Promise<any>;
    redo(undoState: any): Promise<any>;
    reset(): Promise<unknown>;
    get canUndo(): boolean;
    get canRedo(): boolean;
}
