const Resource = require('lib/models/Resource');
const BaseService = require('lib/services/BaseService');
const BaseSyncTarget = require('lib/BaseSyncTarget');
const { Logger } = require('lib/logger.js');

class ResourceFetcher extends BaseService {

	constructor(fileApi) {
		super();

		if (typeof fileApi !== 'function') throw new Error('fileApi must be a function that returns the API');
		
		this.logger_ = new Logger();
		this.fileApi_ = fileApi;
		this.queue_ = [];
		this.fetchingItems_ = {};
		this.resourceDirName_ = BaseSyncTarget.resourceDirName();
		this.queueMutex_ = new Mutex();
		this.maxDownloads_ = 3;
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	fileApi() {
		return this.fileApi_();
	}

	queuedItemIndex_(resourceId) {
		for (let i = 0; i < this.fetchingItems_.length; i++) {
			const item = this.fetchingItems_[i];
			if (item.id === resourceId) return i;
		}
		return -1;
	}

	queueDownload(resourceId, priority = null) {
		if (priority === null) priority = 'normal';

		const index = this.queuedItemIndex_(resourceId);
		if (index >= 0) return;

		const item = { id: resourceId };

		if (priority === 'high') {
			this.queue_.splice(0, 0, item);
		} else {
			this.queue_.push(item);
		}

		this.scheduleQueueProcess_();
	}

	async startDownload_(resourceId) {
		if (this.fetchingItems_[resourceId]) return;
		this.fetchingItems_[resourceId] = true;

		const resource = await Resource.load(resourceId);

		this.fetchingItems_[resourceId] = resource;

		const localResourceContentPath = Resource.fullPath(resource);
		const remoteResourceContentPath = this.resourceDirName_ + "/" + resource.id;

		await Resource.save({ id: resource.id, fetch_status: Resource.FETCH_STATUS_STARTED });

		this.fileApi().get(remoteResourceContentPath, { path: localResourceContentPath, target: "file" }).then(async () => {
			delete this.fetchingItems_[resource.id];
			await Resource.save({ id: resource.id, fetch_status: Resource.FETCH_STATUS_DONE });
			this.scheduleQueueProcess_();
		}).catch(async (error) => {
			delete this.fetchingItems_[resource.id];
			await Resource.save({ id: resource.id, fetch_status: Resource.FETCH_STATUS_ERROR, fetch_error: error.message });
			this.scheduleQueueProcess_();
		});
	}

	processQueue_() {
		while (Object.getOwnPropertyNames(this.fetchingItems_).length < this.maxDownloads_) {
			if (!this.queue_.length) return;
			const item = this.queue_.splice(0, 1)[0];
			this.startDownload_(item.id);
		}
	}

	async waitForAllFinished() {
		return new Promise((resolve, reject) => {
			const iid = setInterval(() => {
				if (!this.queue_.length && !Object.getOwnPropertyNames(this.fetchingItems_).length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	scheduleQueueProcess_() {
		if (this.scheduleQueueProcessIID_) {
			clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}

		this.scheduleQueueProcessIID_ = setTimeout(() => {
			this.processQueue_();
			this.scheduleQueueProcessIID_ = null;
		}, 100);
	}

}

module.exports = ResourceFetcher;