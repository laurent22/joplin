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
const fs_driver_base_1 = require("@joplin/lib/fs-driver-base");
const RNFetchBlob = require('rn-fetch-blob').default;
const RNFS = require("react-native-fs");
const DocumentPicker = require('react-native-document-picker').default;
const react_native_saf_x_1 = require("@joplin/react-native-saf-x");
const react_native_saf_x_2 = require("@joplin/react-native-saf-x");
const react_native_1 = require("react-native");
const tar = require("tar-stream");
const path_1 = require("path");
const buffer_1 = require("buffer");
const Logger_1 = require("@joplin/utils/Logger");
const logger = Logger_1.default.create('fs-driver-rn');
const ANDROID_URI_PREFIX = 'content://';
function isScopedUri(path) {
    return path.includes(ANDROID_URI_PREFIX);
}
class FsDriverRN extends fs_driver_base_1.default {
    appendFileSync() {
        throw new Error('Not implemented');
    }
    // Encoding can be either "utf8" or "base64"
    appendFile(path, content, encoding = 'base64') {
        if (isScopedUri(path)) {
            return react_native_saf_x_2.default.writeFile(path, content, { encoding: encoding, append: true });
        }
        return RNFS.appendFile(path, content, encoding);
    }
    // Encoding can be either "utf8" or "base64"
    writeFile(path, content, encoding = 'base64') {
        if (isScopedUri(path)) {
            return react_native_saf_x_2.default.writeFile(path, content, { encoding: encoding });
        }
        // We need to use rn-fetch-blob here due to this bug:
        // https://github.com/itinance/react-native-fs/issues/700
        return RNFetchBlob.fs.writeFile(path, content, encoding);
    }
    // same as rm -rf
    remove(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.unlink(path);
        });
    }
    // Returns a format compatible with Node.js format
    rnfsStatToStd_(stat, path) {
        let birthtime;
        const mtime = stat.lastModified ? new Date(stat.lastModified) : stat.mtime;
        if (stat.lastModified) {
            birthtime = new Date(stat.lastModified);
        }
        else if (stat.ctime) {
            // Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
            birthtime = stat.ctime;
        }
        else {
            birthtime = stat.mtime;
        }
        return {
            birthtime,
            mtime,
            isDirectory: () => stat.type ? stat.type === 'directory' : stat.isDirectory(),
            path: path,
            size: stat.size,
        };
    }
    readDirStats(path, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            if (!('recursive' in options))
                options.recursive = false;
            const isScoped = isScopedUri(path);
            let stats = [];
            try {
                if (isScoped) {
                    stats = yield react_native_saf_x_2.default.listFiles(path);
                }
                else {
                    stats = yield RNFS.readDir(path);
                }
            }
            catch (error) {
                throw new Error(`Could not read directory: ${path}: ${error.message}`);
            }
            let output = [];
            for (let i = 0; i < stats.length; i++) {
                const stat = stats[i];
                const relativePath = (isScoped ? stat.uri : stat.path).substr(path.length + 1);
                const standardStat = this.rnfsStatToStd_(stat, relativePath);
                output.push(standardStat);
                if (isScoped) {
                    // readUriDirStatsHandleRecursion_ expects stat to have a URI property.
                    // Use the original stat.
                    output = yield this.readUriDirStatsHandleRecursion_(stat, output, options);
                }
                else {
                    output = yield this.readDirStatsHandleRecursion_(path, standardStat, output, options);
                }
            }
            return output;
        });
    }
    readUriDirStatsHandleRecursion_(stat, output, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.recursive && stat.type === 'directory') {
                const subStats = yield this.readDirStats(stat.uri, options);
                for (let j = 0; j < subStats.length; j++) {
                    const subStat = subStats[j];
                    output.push(subStat);
                }
            }
            return output;
        });
    }
    move(source, dest) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isScopedUri(source) || isScopedUri(dest)) {
                yield react_native_saf_x_2.default.moveFile(source, dest, { replaceIfDestinationExists: true });
            }
            return RNFS.moveFile(source, dest);
        });
    }
    rename(source, dest) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isScopedUri(source) || isScopedUri(dest)) {
                yield react_native_saf_x_2.default.rename(source, dest);
            }
            return RNFS.moveFile(source, dest);
        });
    }
    exists(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isScopedUri(path)) {
                return react_native_saf_x_2.default.exists(path);
            }
            return RNFS.exists(path);
        });
    }
    mkdir(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isScopedUri(path)) {
                yield react_native_saf_x_2.default.mkdir(path);
                return;
            }
            // Also creates parent directories: Works like mkdir -p
            return RNFS.mkdir(path);
        });
    }
    stat(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let r;
                if (isScopedUri(path)) {
                    r = yield react_native_saf_x_2.default.stat(path);
                }
                else {
                    r = yield RNFS.stat(path);
                }
                return this.rnfsStatToStd_(r, path);
            }
            catch (error) {
                if (error && (error.code === 'ENOENT' || !(yield this.exists(path)))) {
                    // Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
                    //     or   { [Error: The file {file} couldn’t be opened because there is no such file.], code: 'ENSCOCOAERRORDOMAIN260' }
                    // which unfortunately does not have a proper error code. Can be ignored.
                    return null;
                }
                else {
                    throw error;
                }
            }
        });
    }
    // NOTE: DOES NOT WORK - no error is thrown and the function is called with the right
    // arguments but the function returns `false` and the timestamp is not set.
    // Current setTimestamp is not really used so keep it that way, but careful if it
    // becomes needed.
    setTimestamp() {
        return __awaiter(this, void 0, void 0, function* () {
            // return RNFS.touch(path, timestampDate, timestampDate);
        });
    }
    open(path, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isScopedUri(path)) {
                throw new Error('open() not implemented in FsDriverAndroid');
            }
            // Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
            // So instead we stat the file here and use stat.size to manually check for end of file.
            // Bug: https://github.com/itinance/react-native-fs/issues/342
            const stat = yield this.stat(path);
            return {
                path: path,
                offset: 0,
                mode: mode,
                stat: stat,
            };
        });
    }
    close() {
        // Nothing
        return null;
    }
    readFile(path, encoding = 'utf8') {
        if (encoding === 'Buffer')
            throw new Error('Raw buffer output not supported for FsDriverRN.readFile');
        if (isScopedUri(path)) {
            return react_native_saf_x_2.default.readFile(path, { encoding: encoding });
        }
        return RNFS.readFile(path, encoding);
    }
    // Always overwrite destination
    copy(source, dest) {
        return __awaiter(this, void 0, void 0, function* () {
            let retry = false;
            try {
                if (isScopedUri(source) || isScopedUri(dest)) {
                    yield react_native_saf_x_2.default.copyFile(source, dest, { replaceIfDestinationExists: true });
                    return;
                }
                yield RNFS.copyFile(source, dest);
            }
            catch (error) {
                // On iOS it will throw an error if the file already exist
                retry = true;
                yield this.unlink(dest);
            }
            if (retry) {
                if (isScopedUri(source) || isScopedUri(dest)) {
                    yield react_native_saf_x_2.default.copyFile(source, dest, { replaceIfDestinationExists: true });
                }
                else {
                    yield RNFS.copyFile(source, dest);
                }
            }
        });
    }
    unlink(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (isScopedUri(path)) {
                    yield react_native_saf_x_2.default.unlink(path);
                    return;
                }
                yield RNFS.unlink(path);
            }
            catch (error) {
                if (error && ((error.message && error.message.indexOf('exist') >= 0) || error.code === 'ENOENT')) {
                    // Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
                    // which unfortunately does not have a proper error code. Can be ignored.
                }
                else {
                    throw error;
                }
            }
        });
    }
    readFileChunk(handle, length, encoding = 'base64') {
        return __awaiter(this, void 0, void 0, function* () {
            if (handle.offset + length > handle.stat.size) {
                length = handle.stat.size - handle.offset;
            }
            if (!length)
                return null;
            const output = yield RNFS.read(handle.path, length, handle.offset, encoding);
            // eslint-disable-next-line require-atomic-updates
            handle.offset += length;
            return output ? output : null;
        });
    }
    resolve(path) {
        throw new Error(`Not implemented: resolve(): ${path}`);
    }
    resolveRelativePathWithinDir(_baseDir, relativePath) {
        throw new Error(`Not implemented: resolveRelativePathWithinDir(): ${relativePath}`);
    }
    md5File(path) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`Not implemented: md5File(): ${path}`);
        });
    }
    tarExtract(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented: tarExtract');
        });
    }
    tarCreate(options, filePaths) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Choose a default cwd if not given
            const cwd = (_a = options.cwd) !== null && _a !== void 0 ? _a : RNFS.DocumentDirectoryPath;
            const file = (0, path_1.resolve)(cwd, options.file);
            if (yield this.exists(file)) {
                throw new Error('Error! Destination already exists');
            }
            const pack = tar.pack();
            for (const path of filePaths) {
                const absPath = (0, path_1.resolve)(cwd, path);
                const stat = yield this.stat(absPath);
                const sizeBytes = stat.size;
                const entry = pack.entry({ name: path, size: sizeBytes }, (error) => {
                    if (error) {
                        logger.error(`Tar error: ${error}`);
                    }
                });
                const chunkSize = 1024 * 100; // 100 KiB
                for (let offset = 0; offset < sizeBytes; offset += chunkSize) {
                    // The RNFS documentation suggests using base64 for binary files.
                    const part = yield RNFS.read(absPath, chunkSize, offset, 'base64');
                    entry.write(buffer_1.Buffer.from(part, 'base64'));
                }
                entry.end();
            }
            pack.finalize();
            // The streams used by tar-stream seem not to support a chunk size
            // (it seems despite the typings provided).
            let data = null;
            while ((data = pack.read()) !== null) {
                const buff = buffer_1.Buffer.from(data);
                const base64Data = buff.toString('base64');
                yield this.appendFile(file, base64Data, 'base64');
            }
        });
    }
    getExternalDirectoryPath() {
        return __awaiter(this, void 0, void 0, function* () {
            let directory;
            if (this.isUsingAndroidSAF()) {
                const doc = yield (0, react_native_saf_x_2.openDocumentTree)(true);
                if (doc === null || doc === void 0 ? void 0 : doc.uri) {
                    directory = doc === null || doc === void 0 ? void 0 : doc.uri;
                }
            }
            else {
                directory = RNFS.ExternalDirectoryPath;
            }
            return directory;
        });
    }
    isUsingAndroidSAF() {
        return react_native_1.Platform.OS === 'android' && react_native_1.Platform.Version > 28;
    }
    /** always returns an array */
    pickDocument(options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { multiple = false } = options || {};
            let result;
            try {
                if (this.isUsingAndroidSAF()) {
                    result = yield (0, react_native_saf_x_1.openDocument)({ multiple });
                    if (!result) {
                        // to catch the error down below using the 'cancel' keyword
                        throw new Error('User canceled document picker');
                    }
                    result = result.map(r => {
                        r.type = r.mime;
                        r.fileCopyUri = r.uri;
                        return r;
                    });
                }
                else {
                    // the result is an array
                    if (multiple) {
                        result = yield DocumentPicker.pick({ allowMultiSelection: true });
                    }
                    else {
                        result = [yield DocumentPicker.pick()];
                    }
                }
            }
            catch (error) {
                if (DocumentPicker.isCancel(error) || ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('cancel'))) {
                    // eslint-disable-next-line no-console
                    console.info('pickDocuments: user has cancelled');
                    return null;
                }
                else {
                    throw error;
                }
            }
            return result;
        });
    }
}
exports.default = FsDriverRN;
//# sourceMappingURL=fs-driver-web.js.map