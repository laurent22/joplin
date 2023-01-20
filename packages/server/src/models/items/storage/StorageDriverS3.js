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
const client_s3_1 = require("@aws-sdk/client-s3");
const errors_1 = require("../../../utils/errors");
const types_1 = require("../../../utils/types");
const StorageDriverBase_1 = require("./StorageDriverBase");
function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
        const buffer = [];
        let hasError = false;
        stream.on('data', (chunk) => {
            if (hasError)
                return;
            buffer.push(chunk);
        });
        stream.on('end', () => {
            if (hasError)
                return;
            resolve(Buffer.concat(buffer));
        });
        stream.on('error', (error) => {
            if (hasError)
                return;
            hasError = true;
            reject(error);
        });
    });
}
class StorageDriverS3 extends StorageDriverBase_1.default {
    constructor(id, config) {
        super(id, Object.assign({ type: types_1.StorageDriverType.S3 }, config));
        this.client_ = new client_s3_1.S3Client({
            // We need to set a region. See https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKeyId,
            },
        });
    }
    write(itemId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client_.send(new client_s3_1.PutObjectCommand({
                Bucket: this.config.bucket,
                Key: itemId,
                Body: content,
            }));
        });
    }
    read(itemId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client_.send(new client_s3_1.GetObjectCommand({
                    Bucket: this.config.bucket,
                    Key: itemId,
                }));
                return stream2buffer(response.Body);
            }
            catch (error) {
                if (((_a = error === null || error === void 0 ? void 0 : error.$metadata) === null || _a === void 0 ? void 0 : _a.httpStatusCode) === 404)
                    throw new errors_1.CustomError(`No such item: ${itemId}`, errors_1.ErrorCode.NotFound);
                error.message = `Could not get item "${itemId}": ${error.message}`;
                throw error;
            }
        });
    }
    delete(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemIds = Array.isArray(itemId) ? itemId : [itemId];
            const objects = itemIds.map(id => {
                return { Key: id };
            });
            yield this.client_.send(new client_s3_1.DeleteObjectsCommand({
                Bucket: this.config.bucket,
                Delete: {
                    Objects: objects,
                },
            }));
        });
    }
    exists(itemId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client_.send(new client_s3_1.HeadObjectCommand({
                    Bucket: this.config.bucket,
                    Key: itemId,
                }));
                return true;
            }
            catch (error) {
                if (((_a = error === null || error === void 0 ? void 0 : error.$metadata) === null || _a === void 0 ? void 0 : _a.httpStatusCode) === 404)
                    return false;
                error.message = `Could not check if object exists: "${itemId}": ${error.message}`;
                throw error;
            }
        });
    }
}
exports.default = StorageDriverS3;
//# sourceMappingURL=StorageDriverS3.js.map