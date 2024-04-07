/* eslint-disable multiline-comment-style */

import eventManager, { FilterHandler } from '../../../eventManager';


/**
 * @ignore
 *
 * Not sure if it's the best way to hook into the app
 * so for now disable filters.
 */
export default class JoplinFilters {
	public async on(name: string, callback: FilterHandler) {
		eventManager.filterOn(name, callback);
	}

	public async off(name: string, callback: FilterHandler) {
		eventManager.filterOff(name, callback);
	}
}
