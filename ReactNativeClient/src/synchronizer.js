import { Registry } from 'src/registry.js';
import { Log } from 'src/log.js';
import { Setting } from 'src/models/setting.js';
import { Change } from 'src/models/change.js';
import { Folder } from 'src/models/folder.js';
import { promiseChain } from 'src/promise-chain.js';

class Synchronizer {

	constructor(db, api) {
		this.state_ = 'idle';
		this.db_ = db;
		this.api_ = api;
	}

	state() {
		return this.state_;
	}

	db() {
		return this.db_;
	}

	api() {
		return this.api_;
	}

	switchState(state) {
		Log.info('Sync: switching state to: ' + state);

		if (state == 'downloadChanges') {
			let maxRevId = null;
			this.api().get('synchronizer', { last_id: Setting.value('sync.lastRevId') }).then((syncOperations) => {
				let chain = [];
				for (let i = 0; i < syncOperations.items.length; i++) {
					let syncOp = syncOperations.items[i];
					if (syncOp.id > maxRevId) maxRevId = syncOp.id;
					if (syncOp.item_type == 'folder') {

						if (syncOp.type == 'create') {
							chain.push(() => {
								let folder = Folder.fromApiResult(syncOp.item);
								// TODO: automatically handle NULL fields by checking type and default value of field
								if (!folder.parent_id) folder.parent_id = '';
								return Folder.save(folder, { isNew: true, trackChanges: false });
							});
						}

						if (syncOp.type == 'update') {
							chain.push(() => {
								return Folder.load(syncOp.item_id).then((folder) => {
									folder = Folder.applyPatch(folder, syncOp.item);
									return Folder.save(folder, { trackChanges: false });
								});
							});
						}

						if (syncOp.type == 'delete') {
							chain.push(() => {
								return Folder.delete(syncOp.item_id, { trackChanges: false });
							});
						}
					}
				}
				return promiseChain(chain);
			}).then(() => {
				Log.info('All items synced.');
				if (maxRevId) {
					Setting.setValue('sync.lastRevId', maxRevId);
					return Setting.saveAll();
				}
			}).then(() => {
				this.switchState('uploadingChanges');
			}).catch((error) => {
				Log.warn('Sync error', error);
			});
		} else if (state == 'uploadingChanges') {
			Change.all().then((changes) => {
				let mergedChanges = Change.mergeChanges(changes);
				let chain = [];
				let processedChangeIds = [];
				for (let i = 0; i < mergedChanges.length; i++) {
					let c = mergedChanges[i];
					chain.push(() => {
						let p = null;

						if (c.type == Change.TYPE_NOOP) {
							p = Promise.resolve();
						} else if (c.type == Change.TYPE_CREATE) {
							p = Folder.load(c.item_id).then((folder) => {
								return this.api().put('folders/' + folder.id, null, folder);
							});
						} else if (c.type == Change.TYPE_UPDATE) {
							p = Folder.load(c.item_id).then((folder) => {
								return this.api().patch('folders/' + folder.id, null, folder);
							});
						} else if (c.type == Change.TYPE_DELETE) {
							return this.api().delete('folders/' + c.item_id);
						}

						return p.then(() => {
							processedChangeIds = processedChangeIds.concat(c.ids);
						});
					});
				}

				promiseChain(chain).then(() => {
					Log.info('IDs to delete: ', processedChangeIds);
					Change.deleteMultiple(processedChangeIds);
				});
			});
		}
	}

	start() {
		Log.info('Sync: start');

		if (this.state() != 'idle') {
			Log.info("Sync: cannot start synchronizer because synchronization already in progress. State: " + this.state());
			return;
		}

		if (!this.api().session()) {
			Log.info("Sync: cannot start synchronizer because user is not logged in.");
			return;
		}

		this.switchState('downloadChanges');
	}

}

export { Synchronizer };