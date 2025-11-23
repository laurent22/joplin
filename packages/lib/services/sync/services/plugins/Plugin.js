"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shim_1 = require("../../shim");
const Logger_1 = require("@joplin/utils/Logger");
const EventEmitter = require('events');
const logger = Logger_1.default.create('Plugin');
class Plugin {
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    constructor(baseDir, manifest, scriptText, dispatch, dataDir) {
        this.viewControllers_ = {};
        this.contentScripts_ = {};
        this.devMode_ = false;
        this.builtIn_ = false;
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        this.messageListener_ = null;
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        this.contentScriptMessageListeners_ = {};
        this.dataDirCreated_ = false;
        this.hasErrors_ = false;
        this.running_ = false;
        this.onUnloadListeners_ = [];
        this.baseDir_ = shim_1.default.fsDriver().resolve(baseDir);
        this.manifest_ = manifest;
        this.scriptText_ = scriptText;
        this.dispatch_ = dispatch;
        this.dataDir_ = dataDir;
        this.eventEmitter_ = new EventEmitter();
    }
    get id() {
        return this.manifest.id;
    }
    get devMode() {
        return this.devMode_;
    }
    set devMode(v) {
        this.devMode_ = v;
    }
    get builtIn() {
        return this.builtIn_;
    }
    set builtIn(builtIn) {
        this.builtIn_ = builtIn;
    }
    get manifest() {
        return this.manifest_;
    }
    get scriptText() {
        return this.scriptText_;
    }
    get baseDir() {
        return this.baseDir_;
    }
    get running() {
        return this.running_;
    }
    set running(running) {
        this.running_ = running;
    }
    get dataDir() {
        return shim_1.default.fsDriver().resolve(this.dataDir_);
    }
    async createAndGetDataDir() {
        if (this.dataDirCreated_)
            return this.dataDir_;
        if (!(await shim_1.default.fsDriver().exists(this.dataDir_))) {
            await shim_1.default.fsDriver().mkdir(this.dataDir_);
            this.dataDirCreated_ = true;
        }
        return this.dataDir_;
    }
    get viewCount() {
        return Object.keys(this.viewControllers_).length;
    }
    get hasErrors() {
        return this.hasErrors_;
    }
    set hasErrors(hasErrors) {
        this.hasErrors_ = hasErrors;
    }
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    on(eventName, callback) {
        return this.eventEmitter_.on(eventName, callback);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    off(eventName, callback) {
        return this.eventEmitter_.removeListener(eventName, callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    emit(eventName, event = null) {
        return this.eventEmitter_.emit(eventName, event);
    }
    async registerContentScript(type, id, path) {
        if (!this.contentScripts_[type])
            this.contentScripts_[type] = [];
        const absolutePath = shim_1.default.fsDriver().resolveRelativePathWithinDir(this.baseDir, path);
        if (!(await shim_1.default.fsDriver().exists(absolutePath)))
            throw new Error(`Could not find content script at path ${absolutePath}`);
        this.contentScripts_[type].push({ id, path: absolutePath });
        logger.debug(`"${this.id}": Registered content script: ${type}: ${id}: ${absolutePath}`);
        this.dispatch_({
            type: 'PLUGIN_CONTENT_SCRIPTS_ADD',
            pluginId: this.id,
            contentScript: {
                type: type,
                id: id,
                path: absolutePath,
            },
        });
    }
    contentScriptsByType(type) {
        return this.contentScripts_[type] ? this.contentScripts_[type] : [];
    }
    contentScriptById(id) {
        for (const type in this.contentScripts_) {
            const cs = this.contentScripts_[type];
            for (const c of cs) {
                if (c.id === id)
                    return c;
            }
        }
        return null;
    }
    addViewController(v) {
        if (this.viewControllers_[v.handle])
            throw new Error(`View already added or there is already a view with this ID: ${v.handle}`);
        this.viewControllers_[v.handle] = v;
    }
    removeViewController(v) {
        delete this.viewControllers_[v.handle];
    }
    hasViewController(handle) {
        return !!this.viewControllers_[handle];
    }
    viewController(handle) {
        if (!this.viewControllers_[handle])
            throw new Error(`View not found: ${handle}`);
        return this.viewControllers_[handle];
    }
    deprecationNotice(goneInVersion, message, isError = false) {
        if (isError) {
            throw new Error(`"${this.id}": No longer supported: ${message} (deprecated since version ${goneInVersion})`);
        }
        else {
            logger.warn(`"${this.id}": DEPRECATION NOTICE: ${message} This will stop working in version ${goneInVersion}.`);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    emitMessage(message) {
        if (!this.messageListener_)
            return;
        return this.messageListener_(message);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    onMessage(callback) {
        this.messageListener_ = callback;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    onContentScriptMessage(id, callback) {
        if (!this.contentScriptById(id)) {
            // The script could potentially be registered later on, but still
            // best to print a warning to notify the user of a possible bug.
            logger.warn(`onContentScriptMessage: No such content script: ${id}`);
        }
        this.contentScriptMessageListeners_[id] = callback;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    emitContentScriptMessage(id, message) {
        if (!this.contentScriptMessageListeners_[id])
            return;
        return this.contentScriptMessageListeners_[id](message);
    }
    addOnUnloadListener(callback) {
        this.onUnloadListeners_.push(callback);
    }
    removeOnUnloadListener(callback) {
        this.onUnloadListeners_ = this.onUnloadListeners_.filter(other => other !== callback);
    }
    onUnload() {
        for (const callback of this.onUnloadListeners_) {
            callback();
        }
        this.onUnloadListeners_ = [];
        this.dispatch_({
            type: 'PLUGIN_UNLOAD',
            pluginId: this.id,
        });
    }
}
exports.default = Plugin;
