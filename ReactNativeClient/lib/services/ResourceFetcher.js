const Resource = require('lib/models/Resource');
const Setting = require('lib/models/Setting');
const BaseService = require('lib/services/BaseService');
const ResourceService = require('lib/services/ResourceService');
const BaseSyncTarget = require('lib/BaseSyncTarget');
const { Logger } = require('lib/logger.js');
const EventEmitter = require('events');
const { shim } = require('lib/shim');

class ResourceFetcher extends BaseService {
	constructor(fileApi = null) {
		super();

		this.dispatch = () => {};

		this.setFileApi(fileApi);
		this.logger_ = new Logger();
		this.queue_ = [];
		this.fetchingItems_ = {};
		this.resourceDirName_ = BaseSyncTarget.resourceDirName();
		this.maxDownloads_ = 3;
		this.addingResources_ = false;
		this.eventEmitter_ = new EventEmitter();
	}

	static instance() {
		if (ResourceFetcher.instance_) return ResourceFetcher.instance_;
		ResourceFetcher.instance_ = new ResourceFetcher();
		return ResourceFetcher.instance_;
	}

	on(eventName, callback) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName, callback) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	setFileApi(v) {
		if (v !== null && typeof v !== 'function') throw new Error(`fileApi must be a function that returns the API. Type is ${typeof v}`);
		this.fileApi_ = v;
	}

	async fileApi() {
		return this.fileApi_();
	}

	queuedItemIndex_(resourceId) {
		for (let i = 0; i < this.fetchingItems_.length; i++) {
			const item = this.fetchingItems_[i];
			if (item.id === resourceId) return i;
		}
		return -1;
	}

	updateReport() {
		const fetchingCount = Object.keys(this.fetchingItems_).length;
		this.dispatch({
			type: 'RESOURCE_FETCHER_SET',
			fetchingCount: fetchingCount,
			toFetchCount: fetchingCount + this.queue_.length,
		});
	}

	async markForDownload(resourceIds) {
		if (!Array.isArray(resourceIds)) resourceIds = [resourceIds];

		const fetchStatuses = await Resource.fetchStatuses(resourceIds);

		const idsToKeep = [];
		for (const status of fetchStatuses) {
			if (status.fetch_status !== Resource.FETCH_STATUS_IDLE) continue;
			idsToKeep.push(status.resource_id);
		}

		for (const id of idsToKeep) {
			await Resource.markForDownload(id);
		}

		for (const id of idsToKeep) {
			this.queueDownload_(id, 'high');
		}
	}

	queueDownload_(resourceId, priority = null) {
		if (priority === null) priority = 'normal';

		const index = this.queuedItemIndex_(resourceId);
		if (index >= 0) return false;
		if (this.fetchingItems_[resourceId]) return false;

		const item = { id: resourceId };

		if (priority === 'high') {
			this.queue_.splice(0, 0, item);
		} else {
			this.queue_.push(item);
		}

		this.updateReport();

		this.scheduleQueueProcess();
		return true;
	}

	async startDownload_(resourceId) {
		if (this.fetchingItems_[resourceId]) return;
		this.fetchingItems_[resourceId] = true;

		this.updateReport();

		const resource = await Resource.load(resourceId);
		const localState = await Resource.localState(resource);

		const completeDownload = async (emitDownloadComplete = true, localResourceContentPath = '') => {
			// 2019-05-12: This is only necessary to set the file size of the resources that come via
			// sync. The other ones have been done using migrations/20.js. This code can be removed
			// after a few months.
			if (resource && resource.size < 0 && localResourceContentPath && !resource.encryption_blob_encrypted) {
				await shim.fsDriver().waitTillExists(localResourceContentPath);
				await ResourceService.autoSetFileSizes();
			}

			delete this.fetchingItems_[resource.id];
			this.logger().debug(`ResourceFetcher: Removed from fetchingItems: ${resource.id}. New: ${JSON.stringify(this.fetchingItems_)}`);
			this.scheduleQueueProcess();

			// Note: This downloadComplete event is not really right or useful because the resource
			// might still be encrypted and the caller usually can't do much with this. In particular
			// the note being displayed will refresh the resource images but since they are still
			// encrypted it's not useful. Probably, the views should listen to DecryptionWorker events instead.
			if (resource && emitDownloadComplete) this.eventEmitter_.emit('downloadComplete', { id: resource.id, encrypted: !!resource.encryption_blob_encrypted });
			this.updateReport();
		};

		if (!resource) {
			this.logger().info(`ResourceFetcher: Attempting to download a resource that does not exist (has been deleted?): ${resourceId}`);
			await completeDownload(false);
			return;
		}

		// Shouldn't happen, but just to be safe don't re-download the
		// resource if it's already been downloaded.
		if (localState.fetch_status === Resource.FETCH_STATUS_DONE) {
			await completeDownload(false);
			return;
		}

		this.fetchingItems_[resourceId] = resource;

		const localResourceContentPath = Resource.fullPath(resource, !!resource.encryption_blob_encrypted);
		const remoteResourceContentPath = `${this.resourceDirName_}/${resource.id}`;

		await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_STARTED });

		const fileApi = await this.fileApi();

		this.logger().debug(`ResourceFetcher: Downloading resource: ${resource.id}`);

		this.eventEmitter_.emit('downloadStarted', { id: resource.id });

		fileApi
			.get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' })
			.then(async () => {
				await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_DONE });
				this.logger().debug(`ResourceFetcher: Resource downloaded: ${resource.id}`);
				await completeDownload(true, localResourceContentPath);
			})
			.catch(async error => {
				this.logger().error(`ResourceFetcher: Could not download resource: ${resource.id}`, error);
				await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_ERROR, fetch_error: error.message });
				await completeDownload();
			});
	}

	processQueue_() {
		while (Object.getOwnPropertyNames(this.fetchingItems_).length < this.maxDownloads_) {
			if (!this.queue_.length) break;
			const item = this.queue_.splice(0, 1)[0];
			this.startDownload_(item.id);
		}

		if (!this.queue_.length) {
			this.autoAddResources(10);
		}
	}

	async waitForAllFinished() {
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.updateReportIID_ && !this.scheduleQueueProcessIID_ && !this.addingResources_ && !this.queue_.length && !Object.getOwnPropertyNames(this.fetchingItems_).length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	async autoAddResources(limit = null) {
		if (limit === null) limit = 10;

		if (this.addingResources_) return;
		this.addingResources_ = true;

		this.logger().info(`ResourceFetcher: Auto-add resources: Mode: ${Setting.value('sync.resourceDownloadMode')}`);

		let count = 0;
		const resources = await Resource.needToBeFetched(Setting.value('sync.resourceDownloadMode'), limit);
		for (let i = 0; i < resources.length; i++) {
			const added = this.queueDownload_(resources[i].id);
			if (added) count++;
		}

		this.logger().info(`ResourceFetcher: Auto-added resources: ${count}`);
		this.addingResources_ = false;

		const errorCount = await Resource.downloadStatusCounts(Resource.FETCH_STATUS_ERROR);
		if (errorCount) this.dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
	}

	async start() {
		await Resource.resetStartedFetchStatus();
		this.autoAddResources(10);
	}

	scheduleQueueProcess() {
		if (this.scheduleQueueProcessIID_) {
			clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}

		this.scheduleQueueProcessIID_ = setTimeout(() => {
			this.processQueue_();
			this.scheduleQueueProcessIID_ = null;
		}, 100);
	}

	async fetchAll() {
		await Resource.resetStartedFetchStatus();
		this.autoAddResources(null);
	}

	async destroy() {
		this.eventEmitter_.removeAllListeners();
		if (this.scheduleQueueProcessIID_) {
			clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}
		this.eventEmitter_ = null;
		ResourceFetcher.instance_ = null;

		return await this.waitForAllFinished();
	}
}

ResourceFetcher.instance_ = null;

module.exports = ResourceFetcher;
