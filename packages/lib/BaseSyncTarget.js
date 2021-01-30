"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const EncryptionService_1 = require("./services/EncryptionService");
const shim_1 = require("./shim");
const ResourceService_1 = require("./services/ResourceService");
class BaseSyncTarget {
    constructor(db, options = null) {
        this.synchronizer_ = null;
        this.initState_ = null;
        this.logger_ = null;
        this.db_ = db;
        this.options_ = options;
    }
    static supportsConfigCheck() {
        return false;
    }
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
    static unsupportedPlatforms() {
        return [];
    }
    isAuthenticated() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
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
    initSynchronizer() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('initSynchronizer() not implemented');
        });
    }
    initFileApi() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('initFileApi() not implemented');
        });
    }
    fileApi() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.fileApi_)
                return this.fileApi_;
            this.fileApi_ = yield this.initFileApi();
            return this.fileApi_;
        });
    }
    // Usually each sync target should create and setup its own file API via initFileApi()
    // but for testing purposes it might be convenient to provide it here so that multiple
    // clients can share and sync to the same file api (see test-utils.js)
    setFileApi(v) {
        this.fileApi_ = v;
    }
    synchronizer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.synchronizer_)
                return this.synchronizer_;
            if (this.initState_ == 'started') {
                // Synchronizer is already being initialized, so wait here till it's done.
                return new Promise((resolve, reject) => {
                    const iid = shim_1.default.setInterval(() => {
                        if (this.initState_ == 'ready') {
                            shim_1.default.clearInterval(iid);
                            resolve(this.synchronizer_);
                        }
                        if (this.initState_ == 'error') {
                            shim_1.default.clearInterval(iid);
                            reject(new Error('Could not initialise synchroniser'));
                        }
                    }, 1000);
                });
            }
            else {
                this.initState_ = 'started';
                try {
                    this.synchronizer_ = yield this.initSynchronizer();
                    this.synchronizer_.setLogger(this.logger());
                    this.synchronizer_.setEncryptionService(EncryptionService_1.default.instance());
                    this.synchronizer_.setResourceService(ResourceService_1.default.instance());
                    this.synchronizer_.dispatch = BaseSyncTarget.dispatch;
                    this.initState_ = 'ready';
                    return this.synchronizer_;
                }
                catch (error) {
                    this.initState_ = 'error';
                    throw error;
                }
            }
        });
    }
    syncStarted() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.synchronizer_)
                return false;
            if (!(yield this.isAuthenticated()))
                return false;
            const sync = yield this.synchronizer();
            return sync.state() != 'idle';
        });
    }
}
exports.default = BaseSyncTarget;
BaseSyncTarget.dispatch = () => { };
//# sourceMappingURL=BaseSyncTarget.js.map