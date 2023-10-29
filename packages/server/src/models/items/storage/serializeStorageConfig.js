"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../../utils/types");
const serializeType = (type) => {
    if (type === types_1.StorageDriverType.Database)
        return 'Database';
    if (type === types_1.StorageDriverType.Filesystem)
        return 'Filesystem';
    if (type === types_1.StorageDriverType.Memory)
        return 'Memory';
    if (type === types_1.StorageDriverType.S3)
        return 'S3';
    throw new Error(`Invalid type: "${type}"`);
};
const serializeMode = (mode) => {
    if (mode === types_1.StorageDriverMode.ReadAndWrite)
        return 'ReadAndWrite';
    if (mode === types_1.StorageDriverMode.ReadAndClear)
        return 'ReadAndClear';
    throw new Error(`Invalid type: "${mode}"`);
};
function default_1(config, locationOnly = true) {
    if (!config)
        return '';
    const items = [];
    items.push(`Type=${serializeType(config.type)}`);
    if (config.path)
        items.push(`Path=${config.path}`);
    if (config.region)
        items.push(`Region=${config.region}`);
    if (config.bucket)
        items.push(`Bucket=${config.bucket}`);
    if (!locationOnly && config.mode)
        items.push(`Mode=${serializeMode(config.mode)}`);
    items.sort();
    return items.join('; ');
}
exports.default = default_1;
//# sourceMappingURL=serializeStorageConfig.js.map