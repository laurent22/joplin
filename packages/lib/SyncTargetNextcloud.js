"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const BaseSyncTarget_1 = require("./BaseSyncTarget");
const locale_1 = require("./locale");
const Setting_1 = require("./models/Setting");
const Synchronizer_1 = require("./Synchronizer");
const SyncTargetWebDAV_1 = require("./SyncTargetWebDAV");
class SyncTargetNextcloud extends BaseSyncTarget_1.default {
    static id() {
        return 5;
    }
    static supportsConfigCheck() {
        return true;
    }
    static targetName() {
        return 'nextcloud';
    }
    static label() {
        return (0, locale_1._)('Nextcloud');
    }
    static description() {
        return 'A suite of client-server software for creating and using file hosting services.';
    }
    async isAuthenticated() {
        return true;
    }
    static requiresPassword() {
        return true;
    }
    static async checkConfig(options) {
        return SyncTargetWebDAV_1.default.checkConfig(options);
    }
    async initFileApi() {
        const fileApi = await SyncTargetWebDAV_1.default.newFileApi_(SyncTargetNextcloud.id(), {
            path: () => Setting_1.default.value('sync.5.path'),
            username: () => Setting_1.default.value('sync.5.username'),
            password: () => Setting_1.default.value('sync.5.password'),
            ignoreTlsErrors: () => Setting_1.default.value('net.ignoreTlsErrors'),
        });
        fileApi.setLogger(this.logger());
        return fileApi;
    }
    async initSynchronizer() {
        return new Synchronizer_1.default(this.db(), await this.fileApi(), Setting_1.default.value('appType'));
    }
}
exports.default = SyncTargetNextcloud;
//# sourceMappingURL=SyncTargetNextcloud.js.map