import eventManager from 'lib/eventManager';

export default class SandboxJoplinFilters {
	on(name: string, callback: Function) {
		eventManager.filterOn(name, callback);
	}

	off(name: string, callback: Function) {
		eventManager.filterOff(name, callback);
	}
}
