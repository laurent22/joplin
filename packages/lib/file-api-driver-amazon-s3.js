"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const file_api_1 = require("./file-api");
const path_utils_1 = require("./path-utils");
const shim_1 = require("./shim");
const JoplinError_1 = require("./JoplinError");
const buffer_1 = require("buffer");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const parser = require('fast-xml-parser');
const S3_MAX_DELETES = 1000;
class FileApiDriverAmazonS3 {
    constructor(api, s3_bucket) {
        this.s3_bucket_ = s3_bucket;
        this.api_ = api;
    }
    api() {
        return this.api_;
    }
    requestRepeatCount() {
        return 3;
    }
    makePath_(path) {
        if (!path)
            return '';
        return path;
    }
    hasErrorCode_(error, errorCode) {
        if (!error)
            return false;
        if (error.name) {
            return error.name.indexOf(errorCode) >= 0;
        }
        else if (error.code) {
            return error.code.indexOf(errorCode) >= 0;
        }
        else if (error.Code) {
            return error.Code.indexOf(errorCode) >= 0;
        }
        else {
            return false;
        }
    }
    // Because of the way AWS-SDK-v3 works for getting data from a bucket we will
    // use a pre-signed URL to avoid https://github.com/aws/aws-sdk-js-v3/issues/1877
    async s3GenerateGetURL(key) {
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.api(), new client_s3_1.GetObjectCommand({
            Bucket: this.s3_bucket_,
            Key: key,
        }), {
            expiresIn: 3600,
        });
        return signedUrl;
    }
    async s3ListObjects(key, cursor = null) {
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.s3_bucket_,
                Prefix: key,
                Delimiter: '/',
                ContinuationToken: cursor,
            }), (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    async s3HeadObject(key) {
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.HeadObjectCommand({
                Bucket: this.s3_bucket_,
                Key: key,
            }), (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    async s3PutObject(key, body) {
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.PutObjectCommand({
                Bucket: this.s3_bucket_,
                Key: key,
                Body: body,
            }), (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    async s3UploadFileFrom(path, key) {
        if (!(await shim_1.default.fsDriver().exists(path)))
            throw new Error('s3UploadFileFrom: file does not exist');
        const body = await shim_1.default.fsDriver().readFile(path, 'base64');
        const fileStat = await shim_1.default.fsDriver().stat(path);
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.PutObjectCommand({
                Bucket: this.s3_bucket_,
                Key: key,
                Body: buffer_1.Buffer.from(body, 'base64'),
                ContentLength: fileStat.size,
            }), (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    async s3DeleteObject(key) {
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.s3_bucket_,
                Key: key,
            }), (error, response) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    // Assumes key is formatted, like `{Key: 's3 path'}`
    async s3DeleteObjects(keys) {
        return new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.DeleteObjectsCommand({
                Bucket: this.s3_bucket_,
                Delete: { Objects: keys },
            }), (error, response) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async stat(path) {
        try {
            const metadata = await this.s3HeadObject(this.makePath_(path));
            return this.metadataToStat_(metadata, path);
        }
        catch (error) {
            if (this.hasErrorCode_(error, 'NotFound')) {
                // ignore
            }
            else {
                throw error;
            }
        }
        return null;
    }
    metadataToStat_(md, path) {
        const relativePath = (0, path_utils_1.basename)(path);
        const lastModifiedDate = md['LastModified'] ? new Date(md['LastModified']) : new Date();
        const output = {
            path: relativePath,
            updated_time: lastModifiedDate.getTime(),
            isDeleted: !!md['DeleteMarker'],
            isDir: false,
        };
        return output;
    }
    metadataToStats_(mds) {
        if (!mds)
            return [];
        const output = [];
        for (let i = 0; i < mds.length; i++) {
            output.push(this.metadataToStat_(mds[i], mds[i].Key));
        }
        return output;
    }
    async setTimestamp() {
        throw new Error('Not implemented'); // Not needed anymore
    }
    async delta(path, options) {
        const getDirStats = async (path) => {
            const result = await this.list(path);
            return result.items;
        };
        return await (0, file_api_1.basicDelta)(path, getDirStats, options);
    }
    async list(path) {
        let prefixPath = this.makePath_(path);
        const pathLen = prefixPath.length;
        if (pathLen > 0 && prefixPath[pathLen - 1] !== '/') {
            prefixPath = `${prefixPath}/`;
        }
        this.api().config.systemClockOffset = 0;
        let response = await this.s3ListObjects(prefixPath);
        let output = this.metadataToStats_(response.Contents);
        while (response.IsTruncated) {
            response = await this.s3ListObjects(prefixPath, response.NextContinuationToken);
            output = output.concat(this.metadataToStats_(response.Contents));
        }
        return {
            items: output,
            hasMore: false,
            context: { cursor: response.NextContinuationToken },
        };
    }
    async get(path, options) {
        const remotePath = this.makePath_(path);
        if (!options)
            options = {};
        const responseFormat = options.responseFormat || 'text';
        try {
            let output = null;
            let response = null;
            const s3Url = await this.s3GenerateGetURL(remotePath);
            if (options.target === 'file') {
                output = await shim_1.default.fetchBlob(s3Url, options);
            }
            else if (responseFormat === 'text') {
                response = await shim_1.default.fetch(s3Url, options);
                output = await response.text();
                // we need to make sure that errors get thrown as we are manually fetching above.
                if (!response.ok) {
                    // eslint-disable-next-line no-throw-literal
                    throw { name: response.statusText, output: output };
                }
            }
            return output;
        }
        catch (error) {
            if (error.name === 'FetchError') {
                throw error.message;
            }
            let parsedOutput = '';
            if (error.output) {
                parsedOutput = parser.parse(error.output);
                if (this.hasErrorCode_(parsedOutput.Error, 'AuthorizationHeaderMalformed')) {
                    throw error.output;
                }
                if (this.hasErrorCode_(parsedOutput.Error, 'NoSuchKey')) {
                    return null;
                }
                else if (this.hasErrorCode_(parsedOutput.Error, 'AccessDenied')) {
                    throw new JoplinError_1.default('Do not have proper permissions to Bucket', 'rejectedByTarget');
                }
            }
            else {
                if (error.output) {
                    throw error.output;
                }
                else {
                    throw error;
                }
            }
        }
        return null;
    }
    async mkdir() {
        return true;
    }
    async put(path, content, options = null) {
        const remotePath = this.makePath_(path);
        if (!options)
            options = {};
        try {
            if (options.source === 'file') {
                await this.s3UploadFileFrom(options.path, remotePath);
                return;
            }
            await this.s3PutObject(remotePath, content);
        }
        catch (error) {
            if (this.hasErrorCode_(error, 'AccessDenied')) {
                throw new JoplinError_1.default('Do not have proper permissions to Bucket', 'rejectedByTarget');
            }
            else {
                throw error;
            }
        }
    }
    async delete(path) {
        try {
            await this.s3DeleteObject(this.makePath_(path));
        }
        catch (error) {
            if (this.hasErrorCode_(error, 'NoSuchKey')) {
                // ignore
            }
            else {
                throw error;
            }
        }
    }
    async batchDeletes(paths) {
        const keys = paths.map(path => { return { Key: path }; });
        while (keys.length > 0) {
            const toDelete = keys.splice(0, S3_MAX_DELETES);
            try {
                await this.s3DeleteObjects(toDelete);
            }
            catch (error) {
                if (this.hasErrorCode_(error, 'NoSuchKey')) {
                    // ignore
                }
                else {
                    throw error;
                }
            }
        }
    }
    async move(oldPath, newPath) {
        const req = new Promise((resolve, reject) => {
            this.api().send(new client_s3_1.CopyObjectCommand({
                Bucket: this.s3_bucket_,
                CopySource: this.makePath_(oldPath),
                Key: newPath,
            }), (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
        try {
            await req;
            await this.delete(oldPath);
        }
        catch (error) {
            if (this.hasErrorCode_(error, 'NoSuchKey')) {
                // ignore
            }
            else {
                throw error;
            }
        }
    }
    format() {
        throw new Error('Not supported');
    }
    async clearRoot() {
        const listRecursive = async (cursor = null) => {
            return new Promise((resolve, reject) => {
                return this.api().send(new client_s3_1.ListObjectsV2Command({
                    Bucket: this.s3_bucket_,
                    ContinuationToken: cursor,
                }), (error, response) => {
                    if (error)
                        reject(error);
                    else
                        resolve(response);
                });
            });
        };
        let response = await listRecursive();
        if (response.Contents === undefined)
            response.Contents = [];
        let keys = response.Contents.map((content) => content.Key);
        while (response.IsTruncated) {
            response = await listRecursive(response.NextContinuationToken);
            keys = keys.concat(response.Contents.map((content) => content.Key));
        }
        await this.batchDeletes(keys);
    }
}
exports.default = FileApiDriverAmazonS3;
//# sourceMappingURL=file-api-driver-amazon-s3.js.map