import { Registry } from 'src/registry.js';
import { Log } from 'src/log.js';
import { Setting } from 'src/models/setting.js';
import { Change } from 'src/models/change.js';
import { Folder } from 'src/models/folder.js';

class Synchronizer {

	constructor() {
		this.state_ = 'idle';
	}

	state() {
		return this.state_;
	}

	db() {
		return Registry.db();
	}

	api() {
		return Registry.api();
	}

	switchState(state) {
		Log.info('Sync: switching state to: ' + state);

		if (state == 'downloadChanges') {
			this.api().get('synchronizer', { last_id: Setting.value('sync.lastRevId') }).then((syncOperations) => {
				let promise = new Promise((resolve, reject) => { resolve(); });
				for (let i = 0; i < syncOperations.items.length; i++) {
					let syncOp = syncOperations.items[i];
					if (syncOp.item_type == 'folder') {
						if (syncOp.type == 'create') {
							promise = promise.then(() => {
								let folder = Folder.fromApiResult(syncOp.item);
								// TODO: automatically handle NULL fields by checking type and default value of field
								if (!folder.parent_id) folder.parent_id = '';
								return Folder.save(folder, true, true);
							});
						}
					}
				}

				promise.then(() => {
					Log.info('All items synced.');
				}).catch((error) => {
					Log.warn('Sync error', error);
				});
			});
		} else {

		}
	}

	start() {

		if (this.state() != 'idle') {
			Log.info("Sync: cannot start synchronizer because synchronization already in progress. State: " + this.state());
			return;
		}

		Log.info('Sync: start');

		this.switchState('downloadChanges');
	}

}

export { Synchronizer };