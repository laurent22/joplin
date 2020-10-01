import eventManager from 'lib/eventManager';

export default class JoplinFilters {
	async on(name: string, callback: Function) {
		eventManager.filterOn(name, callback);
	}

	async off(name: string, callback: Function) {
		eventManager.filterOff(name, callback);
	}
}
