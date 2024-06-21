import Logger from '@joplin/utils/Logger';
import Synchronizer from './Synchronizer';
import EncryptionService from './services/e2ee/EncryptionService';
import shim from './shim';
import ResourceService from './services/ResourceService';
import ShareService from './services/share/ShareService';

export interface CheckConfigResult {
	ok: boolean;
	errorMessage: string;
}

export default class BaseSyncTarget {

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static dispatch: Function = () => {};

	private synchronizer_: Synchronizer = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private initState_: any = null;
	private logger_: Logger = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private options_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private db_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected fileApi_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(db: any, options: any = null) {
		this.db_ = db;
		this.options_ = options;
	}

	public static supportsConfigCheck() {
		return false;
	}

	// Returns true if the sync target expects a non-empty sync.{id}.password
	// setting.
	public static requiresPassword() {
		return false;
	}

	public static description(): string {
		return '';
	}

	public static supportsSelfHosted(): boolean {
		return true;
	}

	public static supportsRecursiveLinkedNotes(): boolean {
		return false;
	}

	public static supportsShare(): boolean {
		return false;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public option(name: string, defaultValue: any = null) {
		return this.options_ && name in this.options_ ? this.options_[name] : defaultValue;
	}

	protected logger() {
		return this.logger_;
	}

	public setLogger(v: Logger) {
		this.logger_ = v;
	}

	protected db() {
		return this.db_;
	}

	// If [] is returned it means all platforms are supported
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static unsupportedPlatforms(): any[] {
		return [];
	}

	public async isAuthenticated() {
		return false;
	}

	public authRouteName(): string {
		return null;
	}

	public static id(): number {
		throw new Error('id() not implemented');
	}

	// Note: it cannot be called just "name()" because that's a reserved keyword and
	// it would throw an obscure error in React Native.
	public static targetName(): string {
		throw new Error('targetName() not implemented');
	}

	public static label(): string {
		throw new Error('label() not implemented');
	}

	protected async initSynchronizer(): Promise<Synchronizer> {
		throw new Error('initSynchronizer() not implemented');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected async initFileApi(): Promise<any> {
		throw new Error('initFileApi() not implemented');
	}

	public async fileApi() {
		if (this.fileApi_) return this.fileApi_;
		this.fileApi_ = await this.initFileApi();
		return this.fileApi_;
	}

	// Usually each sync target should create and setup its own file API via initFileApi()
	// but for testing purposes it might be convenient to provide it here so that multiple
	// clients can share and sync to the same file api (see test-utils.js)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setFileApi(v: any) {
		this.fileApi_ = v;
	}

	public async synchronizer(): Promise<Synchronizer> {
		if (this.synchronizer_) return this.synchronizer_;

		if (this.initState_ === 'started') {
			// Synchronizer is already being initialized, so wait here till it's done.
			return new Promise((resolve, reject) => {
				const iid = shim.setInterval(() => {
					if (this.initState_ === 'ready') {
						shim.clearInterval(iid);
						resolve(this.synchronizer_);
					}
					if (this.initState_ === 'error') {
						shim.clearInterval(iid);
						reject(new Error('Could not initialise synchroniser'));
					}
				}, 1000);
			});
		} else {
			this.initState_ = 'started';

			try {
				this.synchronizer_ = await this.initSynchronizer();
				this.synchronizer_.setLogger(this.logger());
				this.synchronizer_.setEncryptionService(EncryptionService.instance());
				this.synchronizer_.setResourceService(ResourceService.instance());
				this.synchronizer_.setShareService(ShareService.instance());
				this.synchronizer_.dispatch = BaseSyncTarget.dispatch;
				this.initState_ = 'ready';
				return this.synchronizer_;
			} catch (error) {
				this.initState_ = 'error';
				throw error;
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async checkConfig(_options: any): Promise<CheckConfigResult> {
		throw new Error('Not implemented');
	}

	public async syncStarted() {
		if (!this.synchronizer_) return false;
		if (!(await this.isAuthenticated())) return false;
		const sync = await this.synchronizer();
		return sync.state() !== 'idle';
	}
}
