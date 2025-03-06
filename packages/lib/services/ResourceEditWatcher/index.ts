import AsyncActionQueue from '../../AsyncActionQueue';
import shim from '../../shim';
import { _ } from '../../locale';
import { toSystemSlashes } from '../../path-utils';
import Logger from '@joplin/utils/Logger';
import Setting from '../../models/Setting';
import Resource from '../../models/Resource';
import { ResourceEntity } from '../database/types';
const EventEmitter = require('events');
const chokidar = require('chokidar');

type WindowId = string;

interface WatchedItem {
	resourceId: string;
	title: string;
	lastFileUpdatedTime: number;
	lastResourceUpdatedTime: number;
	watchedByWindows: WindowId[];
	path: string;
	asyncSaveQueue: AsyncActionQueue;
	size: number;
}

interface WatchedItems {
	[key: string]: WatchedItem;
}

type OpenItemFn = (path: string)=> void;
type GetWindowIdFn = ()=> string;

export default class ResourceEditWatcher {

	private static instance_: ResourceEditWatcher;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private logger_: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private watcher_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private chokidar_: any;
	private watchedItems_: WatchedItems = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private eventEmitter_: any;
	private tempDir_ = '';
	private openItem_: OpenItemFn;
	private getActiveWindowId_: GetWindowIdFn;

	public constructor() {
		this.logger_ = new Logger();
		this.dispatch = () => {};
		this.watcher_ = null;
		this.chokidar_ = chokidar;
		this.eventEmitter_ = new EventEmitter();
	}

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	public initialize(logger: any, dispatch: Function, openItem: OpenItemFn, getWindowId: GetWindowIdFn) {
		this.logger_ = logger;
		this.dispatch = dispatch;
		this.openItem_ = openItem;
		this.getActiveWindowId_ = getWindowId;
	}

	public static instance() {
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

	public logger() {
		return this.logger_;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public externalApi() {
		return {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			openAndWatch: async ({ resourceId }: any) => {
				return this.openAndWatch(resourceId);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			watch: async ({ resourceId }: any) => {
				await this.watch(resourceId);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			stopWatching: async ({ resourceId }: any) => {
				return this.stopWatching(resourceId);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			isWatched: async ({ resourceId }: any) => {
				return !!this.watchedItemByResourceId(resourceId);
			},
		};
	}

	private watchFile(fileToWatch: string) {
		if (!this.chokidar_) return;

		const makeSaveAction = (resourceId: string, path: string) => {
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

		const handleChangeEvent = async (path: string) => {
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

			// To check if the item has really changed we look at the updated time and size, which
			// in most cases is sufficient. It could be a problem if the editing tool is making a change
			// that neither changes the timestamp nor the file size. The alternative would be to compare
			// the files byte for byte but that could be slow and the file might have changed again by
			// the time we finished comparing.
			if (watchedItem.lastFileUpdatedTime === editedFileUpdatedTime && watchedItem.size === stat.size) {
				// chokidar is buggy and emits "change" events even when nothing has changed
				// so double-check the modified time and skip processing if there's no change.
				// In particular it emits two such events just after the file has been copied
				// in openAndWatch().
				//
				// We also need this because some events are handled twice - once in the "all" event
				// handle and once in the "raw" event handler, due to a bug in chokidar. So having
				// this check means we don't unnecessarily save the resource twice when the file is
				// modified by the user.
				this.logger().debug(`ResourceEditWatcher: No timestamp and file size change - skip: ${resourceId}`);
				return;
			}

			this.logger().debug(`ResourceEditWatcher: Queuing save action: ${resourceId}`);
			watchedItem.asyncSaveQueue.push(makeSaveAction(resourceId, path));
			watchedItem.lastFileUpdatedTime = editedFileUpdatedTime;
			watchedItem.size = stat.size;
		};

		if (!this.watcher_) {
			this.watcher_ = this.chokidar_.watch(fileToWatch, {
				// Need to turn off fs-events because when it's on Chokidar
				// keeps emitting "modified" events (on "raw" handler), several
				// times per seconds, even when nothing is changed.
				useFsEvents: false,
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			this.watcher_.on('all', (event: any, path: string) => {
				path = path ? toSystemSlashes(path, 'linux') : '';

				this.logger().info(`ResourceEditWatcher: Event: ${event}: ${path}`);

				if (event === 'unlink') {
					// File are unwatched in the stopWatching functions below. When we receive an unlink event
					// here it might be that the file is quickly moved to a different location and replaced by
					// another file with the same name, as it happens with emacs. So because of this
					// we keep watching anyway.
					// See: https://github.com/laurent22/joplin/issues/710#issuecomment-420997167
					// this.watcher_.unwatch(path);
				} else if (event === 'change') {
					void handleChangeEvent(path);
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			this.watcher_.on('raw', (event: string, _path: string, options: any) => {
				const watchedPath = options.watchedPath ? toSystemSlashes(options.watchedPath, 'linux') : '';

				this.logger().debug(`ResourceEditWatcher: Raw event: ${event}: ${watchedPath}`);
				if (event === 'rename') {
					this.watcher_.unwatch(watchedPath);
					this.watcher_.add(watchedPath);
					void handleChangeEvent(watchedPath);
				}
			});
		} else {
			this.watcher_.add(fileToWatch);
		}

		return this.watcher_;
	}

	private async makeEditPath(resource: ResourceEntity) {
		const tempDir = await this.tempDir();
		return toSystemSlashes(await shim.fsDriver().findUniqueFilename(`${tempDir}/${Resource.friendlySafeFilename(resource)}`), 'linux');
	}

	private async copyResourceToEditablePath(resourceId: string) {
		const resource = await Resource.load(resourceId);
		if (!(await Resource.isReady(resource))) throw new Error(_('This attachment is not downloaded or not decrypted yet'));
		const sourceFilePath = Resource.fullPath(resource);
		const editFilePath = await this.makeEditPath(resource);
		await shim.fsDriver().copy(sourceFilePath, editFilePath);
		return { resource, editFilePath };
	}

	private async watch(resourceId: string): Promise<WatchedItem> {
		const sourceWindowId = this.getActiveWindowId_();
		let watchedItem = this.watchedItemByResourceId(resourceId);

		if (!watchedItem) {
			// Immediately create and push the item to prevent race conditions

			watchedItem = {
				resourceId: resourceId,
				title: '',
				lastFileUpdatedTime: 0,
				lastResourceUpdatedTime: 0,
				watchedByWindows: [sourceWindowId],
				asyncSaveQueue: new AsyncActionQueue(1000),
				path: '',
				size: -1,
			};

			this.watchedItems_[resourceId] = watchedItem;
			const { resource, editFilePath } = await this.copyResourceToEditablePath(resourceId);
			const stat = await shim.fsDriver().stat(editFilePath);

			watchedItem.path = editFilePath;
			watchedItem.lastFileUpdatedTime = stat.mtime.getTime();
			watchedItem.lastResourceUpdatedTime = resource.updated_time;
			watchedItem.size = stat.size;
			watchedItem.title = resource.title;
			// Reset the watching window list to handle the case where the active window
			// was changed while loading the resource.
			watchedItem.watchedByWindows = [this.getActiveWindowId_()];

			this.watchFile(editFilePath);

			this.dispatch({
				type: 'RESOURCE_EDIT_WATCHER_SET',
				id: resource.id,
				title: resource.title,
			});
		} else if (!watchedItem.watchedByWindows.includes(sourceWindowId)) {
			watchedItem = {
				...this.watchedItems_[resourceId],
				watchedByWindows: [...watchedItem.watchedByWindows, sourceWindowId],
			};
			this.watchedItems_[resourceId] = watchedItem;

			this.dispatch({
				type: 'RESOURCE_EDIT_WATCHER_SET',
				id: watchedItem.resourceId,
				title: watchedItem.title,
			});
		}

		this.logger().info(`ResourceEditWatcher: Started watching ${watchedItem.path}`);

		return watchedItem;
	}

	public async openAndWatch(resourceId: string) {
		const watchedItem = await this.watch(resourceId);
		this.openItem_(watchedItem.path);
	}

	// This call simply copies the resource file to a separate path and opens it.
	// That way, even if it is changed, the real resource file on drive won't be
	// affected.
	public async openAsReadOnly(resourceId: string) {
		const { editFilePath } = await this.copyResourceToEditablePath(resourceId);
		await shim.fsDriver().chmod(editFilePath, 0o0666);
		this.openItem_(editFilePath);
	}

	public async stopWatching(resourceId: string) {
		if (!resourceId) return;

		const item = this.watchedItemByResourceId(resourceId);
		if (!item) {
			this.logger().error(`ResourceEditWatcher: Trying to stop watching non-watched resource ${resourceId}`);
			return;
		}

		await item.asyncSaveQueue.processAllNow();

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

	public async stopWatchingAll(sourceWindow: string) {
		const promises = [];
		for (const resourceId in this.watchedItems_) {
			let item = this.watchedItems_[resourceId];

			if (item.watchedByWindows.includes(sourceWindow)) {
				const otherWatchingWindows = item.watchedByWindows.filter(id => id !== sourceWindow);
				item = { ...item, watchedByWindows: otherWatchingWindows };
				this.watchedItems_[resourceId] = item;
			}

			if (item.watchedByWindows.length === 0) {
				promises.push(this.stopWatching(item.resourceId));
			}
		}
		await Promise.all(promises);

		this.dispatch({
			type: 'RESOURCE_EDIT_WATCHER_CLEAR',
			windowId: sourceWindow,
		});
	}

	private watchedItemByResourceId(resourceId: string): WatchedItem {
		return this.watchedItems_[resourceId];
	}

	private watchedItemByPath(path: string): WatchedItem {
		for (const resourceId in this.watchedItems_) {
			const item = this.watchedItems_[resourceId];
			if (item.path === path) return item;
		}
		return null;
	}

}
