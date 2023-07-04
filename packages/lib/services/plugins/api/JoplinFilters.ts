/* eslint-disable multiline-comment-style */

import eventManager from '../../../eventManager';

/**
 * @ignore
 *
 * Not sure if it's the best way to hook into the app
 * so for now disable filters.
 */
export default class JoplinFilters {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public async on(name: string, callback: Function) {
		eventManager.filterOn(name, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public async off(name: string, callback: Function) {
		eventManager.filterOff(name, callback);
	}
}
