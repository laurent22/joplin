const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting');
const Resource = require('lib/models/Resource');
const { shim } = require('lib/shim');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const { bridge } = require('electron').remote.require('./bridge');
const { _ } = require('lib/locale');
import AsyncActionQueue from '../AsyncActionQueue';

interface WatchedItem {
	[key: string]: {
		resourceId: string,
		updatedTime: number,
		asyncSaveQueue: AsyncActionQueue,
	}
}

export default class ResourceEditWatcher {

	private static instance_:ResourceEditWatcher;

	private logger_:any;
	// private dispatch:Function;
	private watcher_:any;
	private chokidar_:any;
	private watchedItems_:WatchedItem = {};
	private eventEmitter_:any;

	constructor() {
		this.logger_ = new Logger();
		// this.dispatch = () => {};
		this.watcher_ = null;
		this.chokidar_ = chokidar;
		this.eventEmitter_ = new EventEmitter();
	}

	initialize(logger:any/* , dispatch:Function*/) {
		this.logger_ = logger;
		// this.dispatch = dispatch;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ResourceEditWatcher();
		return this.instance_;
	}

	tempDir() {
		return Setting.value('tempDir');
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
				await shim.updateResourceBlob(resourceId, path);
				this.eventEmitter_.emit('resourceChange', { id: resourceId });
			};
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
					const watchedItem = this.watchedItems_[path];
					const resourceId = watchedItem.resourceId;
					const stat = await shim.fsDriver().stat(path);
					const updatedTime = stat.mtime.getTime();

					if (watchedItem.updatedTime === updatedTime) {
						// chokidar is buggy and emits "change" events even when nothing has changed
						// so double-check the modified time and skip processing if there's no change.
						// In particular it emits two such events just after the file has been copied
						// in openAndWatch().
						this.logger().debug(`ResourceEditWatcher: No timestamp change - skip: ${resourceId}`);
						return;
					}

					if (!watchedItem) {
						this.logger().error(`ResourceEditWatcher: could not find IDs from path: ${path}`);
						return;
					}

					this.logger().debug(`ResourceEditWatcher: Queuing save action: ${resourceId}`);

					watchedItem.asyncSaveQueue.push(makeSaveAction(resourceId, path));

					this.watchedItems_[path] = {
						...watchedItem,
						updatedTime: updatedTime,
					};
				} else if (event === 'error') {
					this.logger().error('ResourceEditWatcher: error');
				}
			});
			// Hack to support external watcher on some linux applications (gedit, gvim, etc)
			// taken from https://github.com/paulmillr/chokidar/issues/591
			// @ts-ignore Leave unused path variable
			this.watcher_.on('raw', async (event:string, path:string, options:any) => {
				if (event === 'rename') {
					this.watcher_.unwatch(options.watchedPath);
					this.watcher_.add(options.watchedPath);
				}
			});
		} else {
			this.watcher_.add(fileToWatch);
		}

		return this.watcher_;
	}

	public async openAndWatch(resourceId:string) {
		let editFilePath = this.resourceIdToPath(resourceId);

		if (!editFilePath) {
			const resource = await Resource.load(resourceId);
			if (!(await Resource.isReady(resource))) throw new Error(_('This attachment is not downloaded or not decrypted yet'));
			const sourceFilePath = Resource.fullPath(resource);
			editFilePath = await shim.fsDriver().findUniqueFilename(`${this.tempDir()}/${Resource.friendlySafeFilename(resource)}`);
			await shim.fsDriver().copy(sourceFilePath, editFilePath);
			const stat = await shim.fsDriver().stat(editFilePath);

			this.watchedItems_[editFilePath] = {
				resourceId: resourceId,
				updatedTime: stat.mtime.getTime(),
				asyncSaveQueue: new AsyncActionQueue(1000),
			};

			this.watch(editFilePath);
		}

		bridge().openItem(editFilePath);

		this.logger().info(`ResourceEditWatcher: Started watching ${editFilePath}`);
	}

	private resourceIdToPath(resourceId:string):string {
		for (const path in this.watchedItems_) {
			const item = this.watchedItems_[path];
			if (item.resourceId === resourceId) return path;
		}
		return null;
	}

}
