"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(plugin, eventManager, eventName, callback) {
    eventManager.on(eventName, callback);
    const dispose = () => {
        eventManager.off(eventName, callback);
    };
    plugin.addOnUnloadListener(dispose);
    return {};
    // Note: It is not currently possible to return an object with a dispose() function because function cannot be serialized when sent via IPC. So it would need send callback mechanism as for plugin functions.
    //
    // Or it could return a simple string ID, which can then be used to stop listening to the event. eg:
    //
    // const listenerId = await joplin.workspace.onNoteChange(() => {});
    // // ... later:
    // await joplin.workspace.removeListener(listenerId);
    // return {
    // 	dispose,
    // };
}
