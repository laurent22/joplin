"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeUserData = exports.deleteNoteUserData = exports.deleteItemUserData = exports.getNoteUserData = exports.getItemUserData = exports.setNoteUserData = exports.setItemUserData = exports.getUserData = exports.setUserData = void 0;
const BaseModel_1 = require("../../BaseModel");
const Note_1 = require("../Note");
const Folder_1 = require("../Folder");
const Resource_1 = require("../Resource");
const Tag_1 = require("../Tag");
const BaseItem_1 = require("../BaseItem");
const maxKeyLength = 255;
const unserializeUserData = (s) => {
    if (!s)
        return {};
    try {
        const r = JSON.parse(s);
        return r;
    }
    catch (error) {
        error.message = `Could not unserialize user data: ${error.message}: ${s}`;
        throw error;
    }
};
const serializeUserData = (d) => {
    if (!d)
        return '';
    return JSON.stringify(d);
};
const setUserData = (userData, namespace, key, value, deleted = false) => {
    if (key.length > maxKeyLength)
        new Error(`Key must no be longer than ${maxKeyLength} characters`);
    if (!(namespace in userData))
        userData[namespace] = {};
    if (key in userData[namespace] && userData[namespace][key].v === value)
        return userData;
    const newUserDataValue = {
        v: value,
        t: Date.now(),
    };
    if (deleted)
        newUserDataValue.d = 1;
    return Object.assign(Object.assign({}, userData), { [namespace]: Object.assign(Object.assign({}, userData[namespace]), { [key]: newUserDataValue }) });
};
exports.setUserData = setUserData;
const getUserData = (userData, namespace, key) => {
    if (!hasUserData(userData, namespace, key))
        return undefined;
    return userData[namespace][key].v;
};
exports.getUserData = getUserData;
const checkIsSupportedItemType = (itemType) => {
    if (![BaseModel_1.ModelType.Note, BaseModel_1.ModelType.Folder, BaseModel_1.ModelType.Tag, BaseModel_1.ModelType.Resource].includes(itemType)) {
        throw new Error(`Unsupported item type: ${itemType}`);
    }
};
const setItemUserData = async (itemType, itemId, namespace, key, value, deleted = false) => {
    checkIsSupportedItemType(itemType);
    const options = { fields: ['user_data'] };
    if (itemType === BaseModel_1.ModelType.Note)
        options.fields.push('parent_id');
    const item = await BaseItem_1.default.loadItem(itemType, itemId, options);
    const userData = unserializeUserData(item.user_data);
    const newUserData = (0, exports.setUserData)(userData, namespace, key, value, deleted);
    const itemToSave = {
        id: itemId,
        user_data: serializeUserData(newUserData),
        updated_time: Date.now(),
    };
    if (itemType === BaseModel_1.ModelType.Note)
        itemToSave.parent_id = item.parent_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const saveOptions = { autoTimestamp: false };
    if (itemType === BaseModel_1.ModelType.Note)
        return Note_1.default.save(itemToSave, saveOptions);
    if (itemType === BaseModel_1.ModelType.Folder)
        return Folder_1.default.save(itemToSave, saveOptions);
    if (itemType === BaseModel_1.ModelType.Resource)
        return Resource_1.default.save(itemToSave, saveOptions);
    if (itemType === BaseModel_1.ModelType.Tag)
        return Tag_1.default.save(itemToSave, saveOptions);
    throw new Error('Unreachable');
};
exports.setItemUserData = setItemUserData;
// Deprecated - don't use
const setNoteUserData = async (note, namespace, key, value, deleted = false) => {
    return (0, exports.setItemUserData)(BaseModel_1.ModelType.Note, note.id, namespace, key, value, deleted);
};
exports.setNoteUserData = setNoteUserData;
const hasUserData = (userData, namespace, key) => {
    if (!(namespace in userData))
        return false;
    if (!(key in userData[namespace]))
        return false;
    if (userData[namespace][key].d)
        return false;
    return true;
};
const getItemUserData = async (itemType, itemId, namespace, key) => {
    checkIsSupportedItemType(itemType);
    const item = await BaseItem_1.default.loadItem(itemType, itemId, { fields: ['user_data'] });
    const userData = unserializeUserData(item.user_data);
    return (0, exports.getUserData)(userData, namespace, key);
};
exports.getItemUserData = getItemUserData;
// Deprecated - don't use
const getNoteUserData = async (note, namespace, key) => {
    return (0, exports.getItemUserData)(BaseModel_1.ModelType.Note, note.id, namespace, key);
};
exports.getNoteUserData = getNoteUserData;
const deleteItemUserData = async (itemType, itemId, namespace, key) => {
    return (0, exports.setItemUserData)(itemType, itemId, namespace, key, 0, true);
};
exports.deleteItemUserData = deleteItemUserData;
// Deprecated - don't use
const deleteNoteUserData = async (note, namespace, key) => {
    return (0, exports.setNoteUserData)(note, namespace, key, 0, true);
};
exports.deleteNoteUserData = deleteNoteUserData;
const mergeUserData = (target, source) => {
    const output = Object.assign({}, target);
    for (const namespaceName of Object.keys(source)) {
        if (!(namespaceName in output))
            output[namespaceName] = source[namespaceName];
        const namespace = source[namespaceName];
        for (const [key, value] of Object.entries(namespace)) {
            // Keep ours
            if (output[namespaceName][key] && output[namespaceName][key].t >= value.t)
                continue;
            // Use theirs
            output[namespaceName][key] = Object.assign({}, value);
        }
    }
    return output;
};
exports.mergeUserData = mergeUserData;
