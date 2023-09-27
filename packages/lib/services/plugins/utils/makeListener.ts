import { EventManager } from '../../../eventManager';
import { Disposable } from '../api/types';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function(eventManager: EventManager, eventName: string, callback: Function): Disposable {
	eventManager.on(eventName, callback);

	return {};

	// Note: It is not currently possible to return an object with a dispose() function because function cannot be serialized when sent via IPC. So it would need send callback mechanism as for plugin functions.
	//
	// Or it could return a simple string ID, which can then be used to stop listening to the event. eg:
	//
	// const listenerId = await joplin.workspace.onNoteChange(() => {});
	// // ... later:
	// await joplin.workspace.removeListener(listenerId);

	// return {
	// 	dispose: () => {
	// 		eventManager.off(eventName, callback);
	// 	}
	// };
}
