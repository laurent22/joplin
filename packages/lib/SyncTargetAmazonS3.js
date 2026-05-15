"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseSyncTarget_1 = require("./BaseSyncTarget");
const locale_1 = require("./locale");
const Setting_1 = require("./models/Setting");
const file_api_1 = require("./file-api");
const Synchronizer_1 = require("./Synchronizer");
const file_api_driver_amazon_s3_1 = require("./file-api-driver-amazon-s3");
const client_s3_1 = require("@aws-sdk/client-s3");
class SyncTargetAmazonS3 extends BaseSyncTarget_1.default {
    static id() {
        return 8;
    }
    static supportsConfigCheck() {
        return true;
    }
    constructor(db, options = null) {
        super(db, options);
        this.api_ = null;
    }
    static targetName() {
        return 'amazon_s3';
    }
    static label() {
        return (0, locale_1._)('S3');
    }
    static description() {
        return 'A service offered by Amazon Web Services (AWS) that provides object storage through a web service interface.';
    }
    async isAuthenticated() {
        return true;
    }
    static requiresPassword() {
        return true;
    }
    static s3BucketName() {
        return Setting_1.default.value('sync.8.path');
    }
    // These are the settings that get read from disk to instantiate the API.
    s3AuthParameters() {
        return {
            // We need to set a region. See https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210
            region: Setting_1.default.value('sync.8.region'),
            credentials: {
                accessKeyId: Setting_1.default.value('sync.8.username'),
                secretAccessKey: Setting_1.default.value('sync.8.password'),
            },
            UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN.
            forcePathStyle: Setting_1.default.value('sync.8.forcePathStyle'), // Older implementations may not support more modern access, so we expose this to allow people the option to toggle.
            endpoint: Setting_1.default.value('sync.8.url'),
            ignoreTlsErrors: Setting_1.default.value('net.ignoreTlsErrors'),
        };
    }
    api() {
        if (this.api_)
            return this.api_;
        this.api_ = new client_s3_1.S3Client(this.s3AuthParameters());
        // There is a bug with auto skew correction in aws-sdk-js-v3
        // and this attempts to remove the skew correction for all calls.
        // There are some additional spots in the app where we reset this
        // to zero as well as it appears the skew logic gets triggered
        // which makes "RequestTimeTooSkewed" errors...
        // See https://github.com/aws/aws-sdk-js-v3/issues/2208
        this.api_.config.systemClockOffset = 0;
        return this.api_;
    }
    static async newFileApi_(syncTargetId, options) {
        // These options are read from the form on the page
        // so we can test new config choices without overriding the current settings.
        const apiOptions = {
            region: options.region(),
            credentials: {
                accessKeyId: options.username(),
                secretAccessKey: options.password(),
            },
            UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN.
            forcePathStyle: options.forcePathStyle(),
            endpoint: options.url(),
            ignoreTlsErrors: options.ignoreTlsErrors(),
        };
        const api = new client_s3_1.S3Client(apiOptions);
        const driver = new file_api_driver_amazon_s3_1.default(api, SyncTargetAmazonS3.s3BucketName());
        const fileApi = new file_api_1.FileApi('', driver);
        fileApi.setSyncTargetId(syncTargetId);
        return fileApi;
    }
    static async checkConfig(options) {
        const output = {
            ok: false,
            errorMessage: '',
        };
        try {
            const fileApi = await SyncTargetAmazonS3.newFileApi_(SyncTargetAmazonS3.id(), options);
            fileApi.requestRepeatCount_ = 0;
            const headBucketReq = new Promise((resolve, reject) => {
                fileApi.driver().api().send(new client_s3_1.HeadBucketCommand({
                    Bucket: options.path(),
                }), (error, response) => {
                    if (error)
                        reject(error);
                    else
                        resolve(response);
                });
            });
            const result = await headBucketReq;
            if (!result)
                throw new Error(`AWS S3 bucket not found: ${SyncTargetAmazonS3.s3BucketName()}`);
            output.ok = true;
        }
        catch (error) {
            if (error.message) {
                output.errorMessage = error.message;
            }
            if (error.code) {
                output.errorMessage += ` (Code ${error.code})`;
            }
        }
        return output;
    }
    async initFileApi() {
        const appDir = '';
        const fileApi = new file_api_1.FileApi(appDir, new file_api_driver_amazon_s3_1.default(this.api(), SyncTargetAmazonS3.s3BucketName()));
        fileApi.setSyncTargetId(SyncTargetAmazonS3.id());
        return fileApi;
    }
    async initSynchronizer() {
        return new Synchronizer_1.default(this.db(), await this.fileApi(), Setting_1.default.value('appType'));
    }
}
exports.default = SyncTargetAmazonS3;
//# sourceMappingURL=SyncTargetAmazonS3.js.map