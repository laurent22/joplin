"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const moment = require("moment");
const file_api_1 = require("./file-api");
const path_utils_1 = require("./path-utils");
const shim_1 = require("./shim");
const buffer_1 = require("buffer");
class FileApiDriverOneDrive {
    constructor(api) {
        this.api_ = api;
    }
    setFileApi(f) {
        this.fileApi_ = f;
    }
    api() {
        return this.api_;
    }
    itemFilter_() {
        return {
            select: 'name,file,folder,fileSystemInfo,parentReference',
        };
    }
    makePath_(path) {
        return path;
    }
    makeItems_(odItems) {
        const output = [];
        for (let i = 0; i < odItems.length; i++) {
            output.push(this.makeItem_(odItems[i]));
        }
        return output;
    }
    makeItem_(odItem) {
        const output = {
            path: odItem.name,
            isDir: 'folder' in odItem,
        };
        if ('deleted' in odItem) {
            output.isDeleted = true;
        }
        else {
            output.updated_time = Number(moment(odItem.fileSystemInfo.lastModifiedDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x'));
        }
        return output;
    }
    async statRaw_(path) {
        let item = null;
        try {
            item = await this.api_.execJson('GET', this.makePath_(path), this.itemFilter_());
        }
        catch (error) {
            if (error.code === 'itemNotFound')
                return null;
            throw error;
        }
        return item;
    }
    async stat(path) {
        const item = await this.statRaw_(path);
        if (!item)
            return null;
        return this.makeItem_(item);
    }
    async setTimestamp(path, timestamp) {
        const body = {
            fileSystemInfo: {
                lastModifiedDateTime: `${moment
                    .unix(timestamp / 1000)
                    .utc()
                    .format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
            },
        };
        const item = await this.api_.execJson('PATCH', this.makePath_(path), null, body);
        return this.makeItem_(item);
    }
    async list(path, options = null) {
        options = Object.assign({ context: null }, options);
        let query = Object.assign(Object.assign({}, this.itemFilter_()), { '$top': 1000 });
        let url = `${this.makePath_(path)}:/children`;
        if (options.context) {
            query = null;
            url = options.context;
        }
        const r = await this.api_.execJson('GET', url, query);
        return {
            hasMore: !!r['@odata.nextLink'],
            items: this.makeItems_(r.value),
            context: r['@odata.nextLink'],
        };
    }
    async get(path, options = null) {
        if (!options)
            options = {};
        try {
            if (options.target === 'file') {
                const response = await this.api_.exec('GET', `${this.makePath_(path)}:/content`, null, null, options);
                return response;
            }
            else {
                const content = await this.api_.execText('GET', `${this.makePath_(path)}:/content`);
                return content;
            }
        }
        catch (error) {
            if (error.code === 'itemNotFound')
                return null;
            throw error;
        }
    }
    async mkdir(path) {
        let item = await this.stat(path);
        if (item)
            return item;
        const parentPath = (0, path_utils_1.dirname)(path);
        item = await this.api_.execJson('POST', `${this.makePath_(parentPath)}:/children`, this.itemFilter_(), {
            name: (0, path_utils_1.basename)(path),
            folder: {},
        });
        return this.makeItem_(item);
    }
    async put(path, content, options = null) {
        if (!options)
            options = {};
        let byteSize = null;
        if (options.source === 'file') {
            byteSize = (await shim_1.default.fsDriver().stat(options.path)).size;
        }
        else {
            options.headers = { 'Content-Type': 'text/plain' };
            byteSize = buffer_1.Buffer.byteLength(content);
        }
        const uploadPath = byteSize < 4 * 1024 * 1024 ? `${this.makePath_(path)}:/content` : `${this.makePath_(path)}:/createUploadSession`;
        const response = await this.api_.exec('PUT', uploadPath, null, content, options);
        return response;
    }
    delete(path) {
        return this.api_.exec('DELETE', this.makePath_(path));
    }
    async move() {
        throw new Error('NOT WORKING');
    }
    format() {
        throw new Error('Not implemented');
    }
    async clearRoot() {
        const recurseItems = async (path) => {
            path = (0, path_utils_1.ltrimSlashes)(path);
            const result = await this.list(this.fileApi_.fullPath(path));
            for (const item of result.items) {
                const fullPath = (0, path_utils_1.ltrimSlashes)(`${path}/${item.path}`);
                if (item.isDir) {
                    await recurseItems(fullPath);
                }
                await this.delete(this.fileApi_.fullPath(fullPath));
            }
        };
        await recurseItems('');
    }
    async delta(path, options = null) {
        const getDirStats = async (path) => {
            let items = [];
            let context = null;
            while (true) {
                const result = await this.list(path, { includeDirs: false, context: context });
                items = items.concat(result.items);
                context = result.context;
                if (!result.hasMore)
                    break;
            }
            return items;
        };
        return await (0, file_api_1.basicDelta)(path, getDirStats, options);
    }
}
exports.default = FileApiDriverOneDrive;
//# sourceMappingURL=file-api-driver-onedrive.js.map