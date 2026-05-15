"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const BaseSyncTarget_1 = require("./BaseSyncTarget");
const locale_1 = require("./locale");
const Setting_1 = require("./models/Setting");
const file_api_1 = require("./file-api");
const Synchronizer_1 = require("./Synchronizer");
const WebDavApi_1 = require("./WebDavApi");
const file_api_driver_webdav_1 = require("./file-api-driver-webdav");
const webDAVUtils_1 = require("./utils/webDAVUtils");
class SyncTargetWebDAV extends BaseSyncTarget_1.default {
    static id() {
        return 6;
    }
    static supportsConfigCheck() {
        return true;
    }
    static targetName() {
        return 'webdav';
    }
    static label() {
        return (0, locale_1._)('WebDAV');
    }
    static description() {
        return 'The WebDAV protocol allows users to create, change and move documents on a server. There are many WebDAV compatible servers, including SeaFile, Nginx or Apache.';
    }
    async isAuthenticated() {
        return true;
    }
    static requiresPassword() {
        return true;
    }
    static async newFileApi_(syncTargetId, options) {
        const apiOptions = {
            baseUrl: () => options.path(),
            username: () => options.username(),
            password: () => options.password(),
            ignoreTlsErrors: () => options.ignoreTlsErrors(),
        };
        const api = new WebDavApi_1.default(apiOptions);
        const driver = new file_api_driver_webdav_1.default(api);
        const fileApi = new file_api_1.FileApi('', driver);
        fileApi.setSyncTargetId(syncTargetId);
        return fileApi;
    }
    static async checkConfig(options) {
        const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), options);
        fileApi.requestRepeatCount_ = 0;
        const output = {
            ok: false,
            errorMessage: '',
        };
        try {
            (0, webDAVUtils_1.default)(options.path());
            const result = await fileApi.stat('');
            if (!result)
                throw new Error(`WebDAV directory not found: ${options.path()}`);
            output.ok = true;
        }
        catch (error) {
            output.errorMessage = error.message;
            if (error.code)
                output.errorMessage += ` (Code ${error.code})`;
        }
        return output;
    }
    async initFileApi() {
        const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), {
            path: () => Setting_1.default.value('sync.6.path'),
            username: () => Setting_1.default.value('sync.6.username'),
            password: () => Setting_1.default.value('sync.6.password'),
            ignoreTlsErrors: () => Setting_1.default.value('net.ignoreTlsErrors'),
        });
        fileApi.setLogger(this.logger());
        return fileApi;
    }
    async initSynchronizer() {
        return new Synchronizer_1.default(this.db(), await this.fileApi(), Setting_1.default.value('appType'));
    }
}
exports.default = SyncTargetWebDAV;
//# sourceMappingURL=SyncTargetWebDAV.js.map