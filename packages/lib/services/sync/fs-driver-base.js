"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const time_1 = require("./time");
const Setting_1 = require("./models/Setting");
const path_utils_1 = require("./path-utils");
const md5 = require('md5');
const resolvePathWithinDir_1 = require("./utils/resolvePathWithinDir");
const buffer_1 = require("buffer");
class FsDriverBase {
    async stat(_path) {
        throw new Error('Not implemented: stat()');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async readFile(_path, _encoding = 'utf8') {
        throw new Error('Not implemented: readFile');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async appendFile(_path, _content, _encoding = 'base64') {
        throw new Error('Not implemented: appendFile');
    }
    async copy(_source, _dest) {
        throw new Error('Not implemented: copy');
    }
    async chmod(_source, _mode) {
        throw new Error('Not implemented: chmod');
    }
    // Must also create parent directories
    async mkdir(_path) {
        throw new Error('Not implemented: mkdir');
    }
    async unlink(_path) {
        throw new Error('Not implemented: unlink');
    }
    async move(_source, _dest) {
        throw new Error('Not implemented: move');
    }
    async rename(source, dest) {
        return this.move(source, dest);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async readFileChunk(_handle, _length, _encoding = 'base64') {
        throw new Error('Not implemented: readFileChunk');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async readFileChunkAsBuffer(handle, length) {
        const chunk = await this.readFileChunk(handle, length, 'base64');
        if (chunk) {
            return buffer_1.Buffer.from(chunk, 'base64');
        }
        else {
            return null;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async open(_path, _mode) {
        throw new Error('Not implemented: open');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async close(_handle) {
        throw new Error('Not implemented: close');
    }
    // Like .readFile, but returns a File object.
    async fileAtPath(_path) {
        throw new Error('Not implemented: fileAtPath');
    }
    async readDirStats(_path, _options = null) {
        throw new Error('Not implemented: readDirStats');
    }
    async exists(_path) {
        throw new Error('Not implemented: exists');
    }
    async remove(_path, _options = null) {
        throw new Error('Not implemented: remove');
    }
    async setTimestamp(_path, _timestampDate) {
        throw new Error('Not implemented: setTimestamp');
    }
    async isDirectory(path) {
        const stat = await this.stat(path);
        return !stat ? false : stat.isDirectory();
    }
    async writeFile(_path, _content, _encoding = 'base64') {
        throw new Error('Not implemented');
    }
    async md5File(_path) {
        throw new Error('Not implemented: md5File');
    }
    resolve(..._paths) {
        throw new Error('Not implemented: resolve');
    }
    // Resolves the provided relative path to an absolute path within baseDir. The function
    // also checks that the absolute path is within baseDir, to avoid security issues.
    // It is expected that baseDir is a safe path (not user-provided).
    resolveRelativePathWithinDir(baseDir, relativePath) {
        const resolvedPath = (0, resolvePathWithinDir_1.default)(baseDir, relativePath);
        if (!resolvedPath)
            throw new Error(`Resolved path for relative path "${relativePath}" is not within base directory "${baseDir}" (Was resolved to ${resolvedPath})`);
        return resolvedPath;
    }
    getExternalDirectoryPath() {
        throw new Error('Not implemented: getExternalDirectoryPath');
    }
    getCacheDirectoryPath() {
        throw new Error('Not implemented: getCacheDirectoryPath');
    }
    getAppDirectoryPath() {
        throw new Error('Not implemented: getCacheDirectoryPath');
    }
    isUsingAndroidSAF() {
        return false;
    }
    async appendBinaryReadableToFile(path, readable) {
        let data = null;
        while ((data = readable.read()) !== null) {
            const buff = buffer_1.Buffer.from(data);
            const base64Data = buff.toString('base64');
            await this.appendFile(path, base64Data, 'base64');
        }
    }
    async readDirStatsHandleRecursion_(basePath, stat, output, options) {
        if (options.recursive && stat.isDirectory()) {
            const subPath = `${basePath}/${stat.path}`;
            const subStats = await this.readDirStats(subPath, options);
            for (let j = 0; j < subStats.length; j++) {
                const subStat = subStats[j];
                subStat.path = `${stat.path}/${subStat.path}`;
                output.push(subStat);
            }
        }
        return output;
    }
    async findUniqueFilename(name, reservedNames = null, markdownSafe = false) {
        if (reservedNames === null) {
            reservedNames = [];
        }
        let counter = 1;
        // On Windows, ./FiLe.md and ./file.md are equivalent file paths.
        // As such, to avoid overwriting reserved names, comparisons need to be
        // case-insensitive.
        reservedNames = reservedNames.map(name => name.toLowerCase());
        const isReserved = (testName) => {
            return reservedNames.includes(testName.toLowerCase());
        };
        const nameNoExt = (0, path_utils_1.filename)(name, true);
        let extension = (0, path_utils_1.fileExtension)(name);
        if (extension)
            extension = `.${extension}`;
        let nameToTry = nameNoExt + extension;
        while (true) {
            // Check if the filename does not exist in the filesystem and is not reserved
            const exists = await this.exists(nameToTry) || isReserved(nameToTry);
            if (!exists)
                return nameToTry;
            if (!markdownSafe) {
                nameToTry = `${nameNoExt} (${counter})${extension}`;
            }
            else {
                nameToTry = `${nameNoExt}-${counter}${extension}`;
            }
            counter++;
            if (counter >= 1000) {
                nameToTry = `${nameNoExt} (${new Date().getTime()})${extension}`;
                await time_1.default.msleep(10);
            }
            if (counter >= 1100)
                throw new Error('Cannot find unique filename');
        }
    }
    async removeAllThatStartWith(dirPath, filenameStart) {
        if (!filenameStart || !dirPath)
            throw new Error('dirPath and filenameStart cannot be empty');
        const stats = await this.readDirStats(dirPath);
        for (const stat of stats) {
            if (stat.path.indexOf(filenameStart) === 0) {
                await this.remove(`${dirPath}/${stat.path}`);
            }
        }
    }
    async waitTillExists(path, timeout = 10000) {
        const startTime = Date.now();
        while (true) {
            const e = await this.exists(path);
            if (e)
                return true;
            if (Date.now() - startTime > timeout)
                return false;
            await time_1.default.msleep(100);
        }
    }
    // TODO: move out of here and make it part of joplin-renderer
    // or assign to option using .bind(fsDriver())
    async cacheCssToFile(cssStrings) {
        const cssString = Array.isArray(cssStrings) ? cssStrings.join('\n') : cssStrings;
        const cssFilePath = `${Setting_1.default.value('tempDir')}/${md5(escape(cssString))}.css`;
        if (!(await this.exists(cssFilePath))) {
            await this.writeFile(cssFilePath, cssString, 'utf8');
        }
        return {
            path: cssFilePath,
            mime: 'text/css',
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async tarExtract(_options) {
        throw new Error('Not implemented: tarExtract');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async tarCreate(_options, _filePaths) {
        throw new Error('Not implemented: tarCreate');
    }
    async zipExtract(_options) {
        throw new Error('Not implemented: zipExtract');
    }
    async cabExtract(_options) {
        throw new Error('Not implemented: cabExtract.');
    }
}
exports.default = FsDriverBase;
