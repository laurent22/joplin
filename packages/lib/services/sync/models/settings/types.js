"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppType = exports.Env = exports.SyncStartupOperation = exports.SettingSectionSource = exports.SettingStorage = exports.SettingItemSubType = exports.SettingItemType = void 0;
var SettingItemType;
(function (SettingItemType) {
    SettingItemType[SettingItemType["Int"] = 1] = "Int";
    SettingItemType[SettingItemType["String"] = 2] = "String";
    SettingItemType[SettingItemType["Bool"] = 3] = "Bool";
    SettingItemType[SettingItemType["Array"] = 4] = "Array";
    SettingItemType[SettingItemType["Object"] = 5] = "Object";
    SettingItemType[SettingItemType["Button"] = 6] = "Button";
})(SettingItemType || (exports.SettingItemType = SettingItemType = {}));
var SettingItemSubType;
(function (SettingItemSubType) {
    SettingItemSubType["FilePathAndArgs"] = "file_path_and_args";
    SettingItemSubType["FilePath"] = "file_path";
    SettingItemSubType["DirectoryPath"] = "directory_path";
    SettingItemSubType["FontFamily"] = "font_family";
    SettingItemSubType["MonospaceFontFamily"] = "monospace_font_family";
})(SettingItemSubType || (exports.SettingItemSubType = SettingItemSubType = {}));
var SettingStorage;
(function (SettingStorage) {
    SettingStorage[SettingStorage["Database"] = 1] = "Database";
    SettingStorage[SettingStorage["File"] = 2] = "File";
})(SettingStorage || (exports.SettingStorage = SettingStorage = {}));
var SettingSectionSource;
(function (SettingSectionSource) {
    SettingSectionSource[SettingSectionSource["Default"] = 1] = "Default";
    SettingSectionSource[SettingSectionSource["Plugin"] = 2] = "Plugin";
})(SettingSectionSource || (exports.SettingSectionSource = SettingSectionSource = {}));
var SyncStartupOperation;
(function (SyncStartupOperation) {
    SyncStartupOperation[SyncStartupOperation["None"] = 0] = "None";
    SyncStartupOperation[SyncStartupOperation["ClearLocalSyncState"] = 1] = "ClearLocalSyncState";
    SyncStartupOperation[SyncStartupOperation["ClearLocalData"] = 2] = "ClearLocalData";
})(SyncStartupOperation || (exports.SyncStartupOperation = SyncStartupOperation = {}));
var Env;
(function (Env) {
    Env["Undefined"] = "SET_ME";
    Env["Dev"] = "dev";
    Env["Prod"] = "prod";
})(Env || (exports.Env = Env = {}));
var AppType;
(function (AppType) {
    AppType["Desktop"] = "desktop";
    AppType["Mobile"] = "mobile";
    AppType["Cli"] = "cli";
})(AppType || (exports.AppType = AppType = {}));
