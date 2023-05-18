import Resource from '../models/Resource';
import Setting from '../models/Setting';
import BaseService from './BaseService';
import ResourceService from './ResourceService';
import Logger from '../Logger';
import shim from '../shim';
const { Dirnames } = require('./synchronizer/utils/types');
const EventEmitter = require('events');

export default class ResourceFetcher extends BaseService {

	public static instance_: ResourceFetcher;

	public dispatch: Function = (_o: any) => {};
	private logger_: Logger = new Logger();
	private queue_: any[] = [];
	private fetchingItems_: any = {};
	private maxDownloads_ = 3;
	private addingResources_ = false;
	private eventEmitter_ = new EventEmitter();
	private autoAddResourcesCalls_: any[] = [];
	private fileApi_: any;
	private updateReportIID_: any;
	private scheduleQueueProcessIID_: any;
	private scheduleAutoAddResourcesIID_: any;

	public constructor(fileApi: any = null) {
		super();
		this.setFileApi(fileApi);
	}

	public static instance() {
		if (ResourceFetcher.instance_) return ResourceFetcher.instance_;
		ResourceFetcher.instance_ = new ResourceFetcher();
		return ResourceFetcher.instance_;
	}

	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public setLogger(logger: Logger) {
		this.logger_ = logger;
	}

	public logger() {
		return this.logger_;
	}

	public setFileApi(v: any) {
		if (v !== null && typeof v !== 'function') throw new Error(`fileApi must be a function that returns the API. Type is ${typeof v}`);
		this.fileApi_ = v;
	}

	public async fileApi() {
		return this.fileApi_();
	}

	private queuedItemIndex_(resourceId: string) {
		for (let i = 0; i < this.fetchingItems_.length; i++) {
			const item = this.fetchingItems_[i];
			if (item.id === resourceId) return i;
		}
		return -1;
	}

	public updateReport() {
		const fetchingCount = Object.keys(this.fetchingItems_).length;
		this.dispatch({
			type: 'RESOURCE_FETCHER_SET',
			fetchingCount: fetchingCount,
			toFetchCount: fetchingCount + this.queue_.length,
		});
	}

	public async markForDownload(resourceIds: string[]) {
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

	public queueDownload_(resourceId: string, priority: string = null) {
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

	private async startDownload_(resourceId: string) {
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

		const fileApi = await this.fileApi();

		if (!fileApi) {
			this.logger().debug('ResourceFetcher: Disabled because fileApi is not set');
			return;
		}

		this.fetchingItems_[resourceId] = resource;

		const localResourceContentPath = Resource.fullPath(resource, !!resource.encryption_blob_encrypted);
		const remoteResourceContentPath = `${Dirnames.Resources}/${resource.id}`;

		await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_STARTED });

		this.logger().debug(`ResourceFetcher: Downloading resource: ${resource.id}`);

		this.eventEmitter_.emit('downloadStarted', { id: resource.id });

		fileApi
			.get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' })
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			.then(async () => {
				await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_DONE });
				this.logger().debug(`ResourceFetcher: Resource downloaded: ${resource.id}`);
				await completeDownload(true, localResourceContentPath);
			})
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			.catch(async (error: any) => {
				this.logger().error(`ResourceFetcher: Could not download resource: ${resource.id}`, error);
				await Resource.setLocalState(resource, { fetch_status: Resource.FETCH_STATUS_ERROR, fetch_error: error.message });
				await completeDownload();
			});
	}

	private processQueue_() {
		while (Object.getOwnPropertyNames(this.fetchingItems_).length < this.maxDownloads_) {
			if (!this.queue_.length) break;
			const item = this.queue_.splice(0, 1)[0];
			void this.startDownload_(item.id);
		}

		if (!this.queue_.length) {
			void this.autoAddResources(10);
		}
	}

	public async waitForAllFinished() {
		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!this.updateReportIID_ &&
                    !this.scheduleQueueProcessIID_ &&
                    !this.queue_.length &&
                    !this.autoAddResourcesCalls_.length &&
                    !Object.getOwnPropertyNames(this.fetchingItems_).length) {

					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}

	public async autoAddResources(limit: number = null) {
		this.autoAddResourcesCalls_.push(true);
		try {
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

			const errorCount = await Resource.downloadStatusCounts(Resource.FETCH_STATUS_ERROR);
			if (errorCount) this.dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });

		} finally {
			this.addingResources_ = false;
			this.autoAddResourcesCalls_.pop();
		}
	}

	public async start() {
		await Resource.resetStartedFetchStatus();
		void this.autoAddResources(10);
	}

	public scheduleQueueProcess() {
		if (this.scheduleQueueProcessIID_) {
			shim.clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}

		this.scheduleQueueProcessIID_ = shim.setTimeout(() => {
			this.processQueue_();
			this.scheduleQueueProcessIID_ = null;
		}, 100);
	}

	public scheduleAutoAddResources() {
		if (this.scheduleAutoAddResourcesIID_) return;

		this.scheduleAutoAddResourcesIID_ = shim.setTimeout(() => {
			this.scheduleAutoAddResourcesIID_ = null;
			void ResourceFetcher.instance().autoAddResources();
		}, 1000);
	}

	public async fetchAll() {
		await Resource.resetStartedFetchStatus();
		void this.autoAddResources(null);
	}

	public async destroy() {
		this.eventEmitter_.removeAllListeners();
		if (this.scheduleQueueProcessIID_) {
			shim.clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}
		if (this.scheduleAutoAddResourcesIID_) {
			shim.clearTimeout(this.scheduleAutoAddResourcesIID_);
			this.scheduleAutoAddResourcesIID_ = null;
		}
		await this.waitForAllFinished();
		this.eventEmitter_ = null;
		ResourceFetcher.instance_ = null;
	}
}
