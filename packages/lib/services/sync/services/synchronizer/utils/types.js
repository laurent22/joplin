"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conflictActions = exports.SyncAction = exports.Dirnames = void 0;
var Dirnames;
(function (Dirnames) {
    Dirnames["Locks"] = "locks";
    Dirnames["Resources"] = ".resource";
    Dirnames["Temp"] = "temp";
})(Dirnames || (exports.Dirnames = Dirnames = {}));
var SyncAction;
(function (SyncAction) {
    SyncAction["ItemConflict"] = "itemConflict";
    SyncAction["NoteConflict"] = "noteConflict";
    SyncAction["ResourceConflict"] = "resourceConflict";
    SyncAction["CreateRemote"] = "createRemote";
    SyncAction["UpdateRemote"] = "updateRemote";
    SyncAction["DeleteRemote"] = "deleteRemote";
    SyncAction["CreateLocal"] = "createLocal";
    SyncAction["UpdateLocal"] = "updateLocal";
    SyncAction["DeleteLocal"] = "deleteLocal";
})(SyncAction || (exports.SyncAction = SyncAction = {}));
exports.conflictActions = [SyncAction.ItemConflict, SyncAction.NoteConflict, SyncAction.ResourceConflict];
