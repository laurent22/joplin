"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ViewController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(handle, pluginId, store) {
        this.handle_ = handle;
        this.pluginId_ = pluginId;
        this.store_ = store;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    get storeView() {
        return this.store_.getState().pluginService.plugins[this.pluginId_].views[this.handle];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    get store() {
        return this.store_;
    }
    get pluginId() {
        return this.pluginId_;
    }
    get key() {
        return this.handle_;
    }
    get handle() {
        return this.handle_;
    }
    get type() {
        throw new Error('Must be overriden');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async emitMessage(event) {
        console.warn('Calling ViewController.emitMessage - but not implemented', event);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    postMessage(message) {
        console.warn('Calling ViewController.postMessage - but not implemented', message);
    }
}
exports.default = ViewController;
