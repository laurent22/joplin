"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const BaseSyncTarget_1 = require("./BaseSyncTarget");
const locale_1 = require("./locale");
const DropboxApi_1 = require("./DropboxApi");
const Setting_1 = require("./models/Setting");
const parameters_1 = require("./parameters");
const file_api_1 = require("./file-api");
const Synchronizer_1 = require("./Synchronizer");
const file_api_driver_dropbox_1 = require("./file-api-driver-dropbox");
class SyncTargetDropbox extends BaseSyncTarget_1.default {
    static id() {
        return 7;
    }
    constructor(db, options = null) {
        super(db, options);
    }
    static targetName() {
        return 'dropbox';
    }
    static label() {
        return (0, locale_1._)('Dropbox');
    }
    static description() {
        return 'A file hosting service that offers cloud storage and file synchronization';
    }
    static supportsSelfHosted() {
        return false;
    }
    authRouteName() {
        return 'DropboxLogin';
    }
    async isAuthenticated() {
        const f = await this.fileApi();
        return !!f
            .driver()
            .api()
            .authToken();
    }
    async api() {
        const fileApi = await this.fileApi();
        return fileApi.driver().api();
    }
    async initFileApi() {
        const params = (0, parameters_1.parameters)().dropbox;
        const api = new DropboxApi_1.default({
            id: params.id,
            secret: params.secret,
        });
        api.on('authRefreshed', (auth) => {
            this.logger().info('Saving updated Dropbox auth.');
            Setting_1.default.setValue(`sync.${SyncTargetDropbox.id()}.auth`, auth ? auth : null);
        });
        const authToken = Setting_1.default.value(`sync.${SyncTargetDropbox.id()}.auth`);
        api.setAuthToken(authToken);
        const appDir = '';
        const fileApi = new file_api_1.FileApi(appDir, new file_api_driver_dropbox_1.default(api));
        fileApi.setSyncTargetId(SyncTargetDropbox.id());
        fileApi.setLogger(this.logger());
        return fileApi;
    }
    async initSynchronizer() {
        if (!(await this.isAuthenticated()))
            throw new Error('User is not authentified');
        return new Synchronizer_1.default(this.db(), await this.fileApi(), Setting_1.default.value('appType'));
    }
}
exports.default = SyncTargetDropbox;
//# sourceMappingURL=SyncTargetDropbox.js.map