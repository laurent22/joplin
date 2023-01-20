"use strict";
// Type={Database,Filesystem,Memory,S3}; Path={/path/to/dir,https://s3bucket}
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../../utils/types");
const parseType = (type) => {
    if (type === 'Database')
        return types_1.StorageDriverType.Database;
    if (type === 'Filesystem')
        return types_1.StorageDriverType.Filesystem;
    if (type === 'Memory')
        return types_1.StorageDriverType.Memory;
    if (type === 'S3')
        return types_1.StorageDriverType.S3;
    throw new Error(`Invalid type: "${type}"`);
};
const parseMode = (mode) => {
    if (mode === 'ReadAndWrite')
        return types_1.StorageDriverMode.ReadAndWrite;
    if (mode === 'ReadAndClear')
        return types_1.StorageDriverMode.ReadAndClear;
    throw new Error(`Invalid type: "${mode}"`);
};
const validate = (config) => {
    if (!config.type)
        throw new Error('Type must be specified');
    if (config.type === types_1.StorageDriverType.Filesystem && !config.path)
        throw new Error('Path must be set for filesystem driver');
    return config;
};
function default_1(connectionString) {
    if (!connectionString)
        return null;
    const output = {
        type: null,
    };
    const items = connectionString.split(';').map(i => i.trim());
    try {
        for (const item of items) {
            if (!item)
                continue;
            const [key, value] = item.split('=').map(s => s.trim());
            if (key === 'Type') {
                output.type = parseType(value);
            }
            else if (key === 'Path') {
                output.path = value;
            }
            else if (key === 'Mode') {
                output.mode = parseMode(value);
            }
            else if (key === 'Region') {
                output.region = value;
            }
            else if (key === 'AccessKeyId') {
                output.accessKeyId = value;
            }
            else if (key === 'SecretAccessKeyId') {
                output.secretAccessKeyId = value;
            }
            else if (key === 'Bucket') {
                output.bucket = value;
            }
            else {
                throw new Error(`Invalid key: "${key}"`);
            }
        }
    }
    catch (error) {
        error.message = `In connection string "${connectionString}": ${error.message}`;
        throw error;
    }
    return validate(output);
}
exports.default = default_1;
//# sourceMappingURL=parseStorageConnectionString.js.map