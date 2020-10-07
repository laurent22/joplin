import eventManager from 'lib/eventManager';

/**
 * @ignore
 *
 * Not sure if it's the best way to hook into the app
 * so for now disable filters.
 */
export default class JoplinFilters {
	async on(name: string, callback: Function) {
		eventManager.filterOn(name, callback);
	}

	async off(name: string, callback: Function) {
		eventManager.filterOff(name, callback);
	}
}
