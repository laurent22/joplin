"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EncryptionService_1 = require("./services/e2ee/EncryptionService");
const shim_1 = require("./shim");
const ResourceService_1 = require("./services/ResourceService");
const ShareService_1 = require("./services/share/ShareService");
class BaseSyncTarget {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(db, options = null) {
        this.synchronizer_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.initState_ = null;
        this.logger_ = null;
        this.db_ = db;
        this.options_ = options;
    }
    static supportsConfigCheck() {
        return false;
    }
    // Returns true if the sync target expects a non-empty sync.{id}.password
    // setting.
    static requiresPassword() {
        return false;
    }
    static description() {
        return '';
    }
    static supportsSelfHosted() {
        return true;
    }
    static supportsRecursiveLinkedNotes() {
        return false;
    }
    static supportsShare() {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    option(name, defaultValue = null) {
        return this.options_ && name in this.options_ ? this.options_[name] : defaultValue;
    }
    logger() {
        return this.logger_;
    }
    setLogger(v) {
        this.logger_ = v;
    }
    db() {
        return this.db_;
    }
    // If [] is returned it means all platforms are supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static unsupportedPlatforms() {
        return [];
    }
    async isAuthenticated() {
        return false;
    }
    authRouteName() {
        return null;
    }
    static id() {
        throw new Error('id() not implemented');
    }
    // Note: it cannot be called just "name()" because that's a reserved keyword and
    // it would throw an obscure error in React Native.
    static targetName() {
        throw new Error('targetName() not implemented');
    }
    static label() {
        throw new Error('label() not implemented');
    }
    async initSynchronizer() {
        throw new Error('initSynchronizer() not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async initFileApi() {
        throw new Error('initFileApi() not implemented');
    }
    async fileApi() {
        if (this.fileApi_)
            return this.fileApi_;
        this.fileApi_ = await this.initFileApi();
        return this.fileApi_;
    }
    // Usually each sync target should create and setup its own file API via initFileApi()
    // but for testing purposes it might be convenient to provide it here so that multiple
    // clients can share and sync to the same file api (see test-utils.js)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setFileApi(v) {
        this.fileApi_ = v;
    }
    async synchronizer() {
        if (this.synchronizer_)
            return this.synchronizer_;
        if (this.initState_ === 'started') {
            // Synchronizer is already being initialized, so wait here till it's done.
            return new Promise((resolve, reject) => {
                const iid = shim_1.default.setInterval(() => {
                    if (this.initState_ === 'ready') {
                        shim_1.default.clearInterval(iid);
                        resolve(this.synchronizer_);
                    }
                    if (this.initState_ === 'error') {
                        shim_1.default.clearInterval(iid);
                        reject(new Error('Could not initialise synchroniser'));
                    }
                }, 1000);
            });
        }
        else {
            this.initState_ = 'started';
            try {
                this.synchronizer_ = await this.initSynchronizer();
                this.synchronizer_.setLogger(this.logger());
                this.synchronizer_.setEncryptionService(EncryptionService_1.default.instance());
                this.synchronizer_.setResourceService(ResourceService_1.default.instance());
                this.synchronizer_.setShareService(ShareService_1.default.instance());
                this.synchronizer_.dispatch = BaseSyncTarget.dispatch;
                this.initState_ = 'ready';
                return this.synchronizer_;
            }
            catch (error) {
                this.initState_ = 'error';
                throw error;
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async checkConfig(_options) {
        throw new Error('Not implemented');
    }
    async syncStarted() {
        if (!this.synchronizer_)
            return false;
        if (!(await this.isAuthenticated()))
            return false;
        const sync = await this.synchronizer();
        return sync.state() !== 'idle';
    }
}
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
BaseSyncTarget.dispatch = () => { };
exports.default = BaseSyncTarget;
