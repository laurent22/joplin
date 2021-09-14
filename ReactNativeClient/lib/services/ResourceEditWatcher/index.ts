import AsyncActionQueue from '../../AsyncActionQueue';
const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting');
const Resource = require('lib/models/Resource');
const { shim } = require('lib/shim');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const { bridge } = require('electron').remote.require('./bridge');
const { _ } = require('lib/locale');

interface WatchedItem {
	resourceId: string,
	lastFileUpdatedTime: number,
	lastResourceUpdatedTime: number,
	path:string,
	asyncSaveQueue: AsyncActionQueue,
}

interface WatchedItems {
	[key:string]: WatchedItem,
}

export default class ResourceEditWatcher {

	private static instance_:ResourceEditWatcher;

	private logger_:any;
	private dispatch:Function;
	private watcher_:any;
	private chokidar_:any;
	private watchedItems_:WatchedItems = {};
	private eventEmitter_:any;
	private tempDir_:string = '';

	constructor() {
		this.logger_ = new Logger();
		this.dispatch = () => {};
		this.watcher_ = null;
		this.chokidar_ = chokidar;
		this.eventEmitter_ = new EventEmitter();
	}

	initialize(logger:any, dispatch:Function) {
		this.logger_ = logger;
		this.dispatch = dispatch;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ResourceEditWatcher();
		return this.instance_;
	}

	private async tempDir() {
		if (!this.tempDir_) {
			this.tempDir_ = `${Setting.value('tempDir')}/edited_resources`;
			await shim.fsDriver().mkdir(this.tempDir_);
		}

		return this.tempDir_;
	}

	logger() {
		return this.logger_;
	}

	on(eventName:string, callback:Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName:string, callback:Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	private watch(fileToWatch:string) {
		if (!this.chokidar_) return;

		const makeSaveAction = (resourceId:string, path:string) => {
			return async () => {
				this.logger().info(`ResourceEditWatcher: Saving resource ${resourceId}`);
				const resource = await Resource.load(resourceId);
				const watchedItem = this.watchedItemByResourceId(resourceId);

				if (resource.updated_time !== watchedItem.lastResourceUpdatedTime) {
					this.logger().info(`ResourceEditWatcher: Conflict was detected (resource was modified from somewhere else, possibly via sync). Conflict note will be created: ${resourceId}`);
					// The resource has been modified from elsewhere, for example via sync
					// so copy the current version to the Conflict notebook, and overwrite
					// the resource content.
					await Resource.createConflictResourceNote(resource);
				}

				const savedResource = await Resource.updateResourceBlobContent(resourceId, path);
				watchedItem.lastResourceUpdatedTime = savedResource.updated_time;
				this.eventEmitter_.emit('resourceChange', { id: resourceId });
			};
		};

		const handleChangeEvent = async (path:string) => {
			this.logger().debug(`ResourceEditWatcher: handleChangeEvent: ${path}`);

			const watchedItem = this.watchedItemByPath(path);

			if (!watchedItem) {
				// The parent directory of the edited resource often gets a change event too
				// and ends up here. Print a warning, but most likely it's nothing important.
				this.logger().debug(`ResourceEditWatcher: could not find resource ID from path: ${path}`);
				return;
			}

			const resourceId = watchedItem.resourceId;
			const stat = await shim.fsDriver().stat(path);
			const editedFileUpdatedTime = stat.mtime.getTime();

			if (watchedItem.lastFileUpdatedTime === editedFileUpdatedTime) {
				// chokidar is buggy and emits "change" events even when nothing has changed
				// so double-check the modified time and skip processing if there's no change.
				// In particular it emits two such events just after the file has been copied
				// in openAndWatch().
				//
				// We also need this because some events are handled twice - once in the "all" event
				// handle and once in the "raw" event handler, due to a bug in chokidar. So having
				// this check means we don't unecessarily save the resource twice when the file is
				// modified by the user.
				this.logger().debug(`ResourceEditWatcher: No timestamp change - skip: ${resourceId}`);
				return;
			}

			this.logger().debug(`ResourceEditWatcher: Queuing save action: ${resourceId}`);
			watchedItem.asyncSaveQueue.push(makeSaveAction(resourceId, path));
			watchedItem.lastFileUpdatedTime = editedFileUpdatedTime;
		};

		if (!this.watcher_) {
			this.watcher_ = this.chokidar_.watch(fileToWatch);
			this.watcher_.on('all', async (event:any, path:string) => {
				this.logger().info(`ResourceEditWatcher: Event: ${event}: ${path}`);

				if (event === 'unlink') {
					// File are unwatched in the stopWatching functions below. When we receive an unlink event
					// here it might be that the file is quickly moved to a different location and replaced by
					// another file with the same name, as it happens with emacs. So because of this
					// we keep watching anyway.
					// See: https://github.com/laurent22/joplin/issues/710#issuecomment-420997167
					// this.watcher_.unwatch(path);
				} else if (event === 'change') {
					handleChangeEvent(path);
				} else if (event === 'error') {
					this.logger().error('ResourceEditWatcher: error');
				}
			});

			// Hack to support external watcher on some linux applications (gedit, gvim, etc)
			// taken from https://github.com/paulmillr/chokidar/issues/591
			//
			// 2020-07-22: It also applies when editing Excel files, which copy the new file
			// then rename, so handling the "change" event alone is not enough as sometimes
			// that event is not event triggered.
			// https://github.com/laurent22/joplin/issues/3407
			//
			// @ts-ignore Leave unused path variable
			this.watcher_.on('raw', async (event:string, path:string, options:any) => {
				this.logger().debug(`ResourceEditWatcher: Raw event: ${event}: ${options.watchedPath}`);
				if (event === 'rename') {
					this.watcher_.unwatch(options.watchedPath);
					this.watcher_.add(options.watchedPath);
					handleChangeEvent(options.watchedPath);
				}
			});
		} else {
			this.watcher_.add(fileToWatch);
		}

		return this.watcher_;
	}

	public async openAndWatch(resourceId:string) {
		let watchedItem = this.watchedItemByResourceId(resourceId);

		if (!watchedItem) {
			// Immediately create and push the item to prevent race conditions

			watchedItem = {
				resourceId: resourceId,
				lastFileUpdatedTime: 0,
				lastResourceUpdatedTime: 0,
				asyncSaveQueue: new AsyncActionQueue(1000),
				path: '',
			};

			this.watchedItems_[resourceId] = watchedItem;

			const resource = await Resource.load(resourceId);
			if (!(await Resource.isReady(resource))) throw new Error(_('This attachment is not downloaded or not decrypted yet'));
			const sourceFilePath = Resource.fullPath(resource);
			const tempDir = await this.tempDir();
			const editFilePath = await shim.fsDriver().findUniqueFilename(`${tempDir}/${Resource.friendlySafeFilename(resource)}`);
			await shim.fsDriver().copy(sourceFilePath, editFilePath);
			const stat = await shim.fsDriver().stat(editFilePath);

			watchedItem.path = editFilePath;
			watchedItem.lastFileUpdatedTime = stat.mtime.getTime();
			watchedItem.lastResourceUpdatedTime = resource.updated_time;

			this.watch(editFilePath);

			this.dispatch({
				type: 'RESOURCE_EDIT_WATCHER_SET',
				id: resource.id,
				title: resource.title,
			});
		}

		bridge().openItem(watchedItem.path);

		this.logger().info(`ResourceEditWatcher: Started watching ${watchedItem.path}`);
	}

	async stopWatching(resourceId:string) {
		if (!resourceId) return;

		const item = this.watchedItemByResourceId(resourceId);
		if (!item) {
			this.logger().error(`ResourceEditWatcher: Trying to stop watching non-watched resource ${resourceId}`);
			return;
		}

		await item.asyncSaveQueue.waitForAllDone();

		try {
			if (this.watcher_) this.watcher_.unwatch(item.path);
			await shim.fsDriver().remove(item.path);
		} catch (error) {
			this.logger().warn(`ResourceEditWatcher: There was an error unwatching resource ${resourceId}. Joplin will ignore the file regardless.`, error);
		}

		delete this.watchedItems_[resourceId];

		this.dispatch({
			type: 'RESOURCE_EDIT_WATCHER_REMOVE',
			id: resourceId,
		});

		this.logger().info(`ResourceEditWatcher: Stopped watching ${item.path}`);
	}

	public async stopWatchingAll() {
		const promises = [];
		for (const resourceId in this.watchedItems_) {
			const item = this.watchedItems_[resourceId];
			promises.push(this.stopWatching(item.resourceId));
		}
		await Promise.all(promises);

		this.dispatch({
			type: 'RESOURCE_EDIT_WATCHER_CLEAR',
		});
	}

	private watchedItemByResourceId(resourceId:string):WatchedItem {
		return this.watchedItems_[resourceId];
	}

	private watchedItemByPath(path:string):WatchedItem {
		for (const resourceId in this.watchedItems_) {
			const item = this.watchedItems_[resourceId];
			if (item.path === path) return item;
		}
		return null;
	}

}
