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
exports.mergeUserData = exports.deleteNoteUserData = exports.getNoteUserData = exports.setNoteUserData = exports.getUserData = exports.setUserData = void 0;
const Note_1 = require("../Note");
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
const setNoteUserData = (note, namespace, key, value, deleted = false) => __awaiter(void 0, void 0, void 0, function* () {
    if (!('user_data' in note) || !('parent_id' in note))
        throw new Error(`Missing user_data or parent_id property when trying to access ${namespace}:${key}`);
    const userData = unserializeUserData(note.user_data);
    const newUserData = (0, exports.setUserData)(userData, namespace, key, value, deleted);
    return Note_1.default.save({
        id: note.id,
        parent_id: note.parent_id,
        user_data: serializeUserData(newUserData),
        updated_time: Date.now(),
    }, {
        autoTimestamp: false,
    });
});
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
const getNoteUserData = (note, namespace, key) => {
    if (!('user_data' in note))
        throw new Error(`Missing user_data property when trying to access ${namespace}:${key}`);
    const userData = unserializeUserData(note.user_data);
    return (0, exports.getUserData)(userData, namespace, key);
};
exports.getNoteUserData = getNoteUserData;
const deleteNoteUserData = (note, namespace, key) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.setNoteUserData)(note, namespace, key, 0, true);
});
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
//# sourceMappingURL=userData.js.map