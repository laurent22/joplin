import { EventManager } from '../../../eventManager';
import { Disposable } from '../api/types';

export default function(eventManager:EventManager, eventName:string, callback:Function):Disposable {
	eventManager.on(eventName, callback);

	return {
		dispose: () => {
			eventManager.off(eventName, callback);
		}
	};
}