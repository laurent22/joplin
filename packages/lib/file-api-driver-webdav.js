"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const file_api_1 = require("./file-api");
const path_utils_1 = require("./path-utils");
const JoplinError_1 = require("./JoplinError");
const Setting_1 = require("./models/Setting");
const webDAVUtils_1 = require("./utils/webDAVUtils");
class FileApiDriverWebDav {
    constructor(api) {
        this.api_ = api;
    }
    api() {
        return this.api_;
    }
    requestRepeatCount() {
        return 3;
    }
    lastRequests() {
        return this.api().lastRequests();
    }
    clearLastRequests() {
        return this.api().clearLastRequests();
    }
    async stat(path) {
        try {
            const result = await this.api().execPropFind(path, 0, ['d:getlastmodified', 'd:resourcetype']);
            const resource = this.api().objectFromJson(result, ['d:multistatus', 'd:response', 0]);
            return this.statFromResource_(resource, path);
        }
        catch (error) {
            if (error.code === 404)
                return null;
            throw error;
        }
    }
    statFromResource_(resource, path) {
        const propStat = this.api().arrayFromJson(resource, ['d:propstat']);
        if (!Array.isArray(propStat))
            throw new Error(`Invalid WebDAV resource format: ${JSON.stringify(resource)}`);
        const resourceTypes = this.api().resourcePropByName(resource, 'array', 'd:resourcetype');
        let isDir = false;
        if (Array.isArray(resourceTypes)) {
            for (let i = 0; i < resourceTypes.length; i++) {
                const t = resourceTypes[i];
                if (typeof t === 'object' && 'd:collection' in t) {
                    isDir = true;
                    break;
                }
            }
        }
        let lastModifiedString = null;
        try {
            lastModifiedString = this.api().resourcePropByName(resource, 'string', 'd:getlastmodified');
        }
        catch (error) {
            if (error.code === 'stringNotFound') {
                // OK
            }
            else {
                throw error;
            }
        }
        if (!lastModifiedString && !isDir)
            throw new Error(`Could not get lastModified date for resource: ${JSON.stringify(resource)}`);
        const lastModifiedDate = lastModifiedString ? new Date(lastModifiedString) : new Date();
        if (isNaN(lastModifiedDate.getTime()))
            throw new Error(`Invalid date: ${lastModifiedString}`);
        return {
            path: path,
            updated_time: lastModifiedDate.getTime(),
            isDir: isDir,
        };
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
    hrefToRelativePath_(href, baseUrl, relativeBaseUrl) {
        let output = '';
        if (href.indexOf(baseUrl) === 0) {
            output = href.substr(baseUrl.length);
        }
        else if (href.indexOf(relativeBaseUrl) === 0) {
            output = href.substr(relativeBaseUrl.length);
        }
        else if (decodeURIComponent(href).indexOf(decodeURIComponent(relativeBaseUrl)) === 0) {
            output = decodeURIComponent(href).substring(decodeURIComponent(relativeBaseUrl).length);
        }
        else {
            throw new Error(`href ${href} not in baseUrl ${baseUrl} nor relativeBaseUrl ${relativeBaseUrl}`);
        }
        return (0, path_utils_1.rtrimSlashes)((0, path_utils_1.ltrimSlashes)(output));
    }
    statsFromResources_(resources) {
        const relativeBaseUrl = this.api().relativeBaseUrl();
        const baseUrl = this.api().baseUrl();
        const output = [];
        for (let i = 0; i < resources.length; i++) {
            const resource = resources[i];
            const href = this.api().stringFromJson(resource, ['d:href', 0]);
            if (href === null)
                continue;
            const path = this.hrefToRelativePath_(href, baseUrl, relativeBaseUrl);
            if (path === '')
                continue; // The list of resources includes the root dir too, which we don't want
            const stat = this.statFromResource_(resources[i], path);
            output.push(stat);
        }
        return output;
    }
    async list(path) {
        const result = await this.api().execPropFind(!path.endsWith('/') ? `${path}/` : path, 1, ['d:getlastmodified', 'd:resourcetype']);
        const resources = this.api().arrayFromJson(result, ['d:multistatus', 'd:response']);
        if (!resources) {
            return {
                items: [],
                hasMore: false,
                context: null,
            };
        }
        const stats = this.statsFromResources_(resources).map((stat) => {
            if (path && stat.path.indexOf(`${path}/`) === 0) {
                const s = stat.path.substr(path.length + 1);
                if (s.split('/').length === 1) {
                    return Object.assign(Object.assign({}, stat), { path: stat.path.substr(path.length + 1) });
                }
            }
            return stat;
        }).filter((stat) => {
            return stat.path !== (0, path_utils_1.rtrimSlashes)(path);
        });
        return {
            items: stats,
            hasMore: false,
            context: null,
        };
    }
    async get(path, options) {
        if (!options)
            options = {};
        if (!options.responseFormat)
            options.responseFormat = 'text';
        try {
            const response = await this.api().exec('GET', path, null, null, options);
            if (response === 'The specified file doesn\'t exist.')
                throw new JoplinError_1.default(response, 404);
            return response;
        }
        catch (error) {
            if (error.code !== 404)
                throw error;
            return null;
        }
    }
    async mkdir(path) {
        try {
            if (!path.endsWith('/'))
                path = `${path}/`;
            await this.api().exec('MKCOL', path);
        }
        catch (error) {
            if (error.code === 405)
                return; // 405 means that the collection already exists (Method Not Allowed)
            if (error.code === 409) {
                const stat = await this.stat(path);
                if (stat)
                    return;
            }
            throw error;
        }
    }
    async put(path, content, options = null) {
        return await this.api().exec('PUT', path, content, null, options);
    }
    async delete(path) {
        try {
            await this.api().exec('DELETE', path);
        }
        catch (error) {
            if (error.code !== 404)
                throw error;
        }
    }
    async move(oldPath, newPath) {
        await this.api().exec('MOVE', oldPath, null, {
            Destination: `${this.api().baseUrl()}/${newPath}`,
            Overwrite: 'T',
        });
    }
    format() {
        throw new Error('Not supported');
    }
    async clearRoot() {
        await this.delete('');
        await this.mkdir('');
    }
    initialize() {
        (0, webDAVUtils_1.default)(Setting_1.default.value('sync.6.path'));
    }
}
exports.default = FileApiDriverWebDav;
//# sourceMappingURL=file-api-driver-webdav.js.map