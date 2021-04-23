import JoplinServerApi from "../../JoplinServerApi";
import Logger from "../../Logger";
import Setting from "../../models/Setting";
import shim from "../../shim";
import SyncTargetJoplinServer from "../../SyncTargetJoplinServer";

const logger = Logger.create('ShareService');

export default class ShareService {

	private static instance_: ShareService;
	private api_:JoplinServerApi = null;
	private dispatch_:Function = null;
	private isRunningInBackground_:boolean = false;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(dispatch:Function) {
		this.dispatch_ = dispatch;
	}

	public get enabled():boolean {
		return Setting.value('sync.target') === SyncTargetJoplinServer.id();
	}

	private get dispatch():Function {
		return this.dispatch_;
	}

	private api():JoplinServerApi {
		if (this.api_) return this.api_;

		this.api_ = new JoplinServerApi({
			baseUrl: () => Setting.value('sync.9.path'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
		});

		return this.api_;
	}

	public async shareFolder(folderId:string) {
		return this.api().exec('POST', 'api/shares', {}, {
			folder_id: folderId,
			type: 3, // JoplinRootFolder
		})
	}

	public async addShareRecipient(shareId:string, recipientEmail:string) {
		return this.api().exec('POST', 'api/shares/' + shareId + '/users', {}, {
			email: recipientEmail,
		})
	}

	public async shares() {
		return this.api().exec('GET', 'api/shares');
	}

	public async shareUsers(shareId:string) {
		return this.api().exec('GET', 'api/shares/' + shareId + '/users');
	}

	public async shareInvitations() {
		return this.api().exec('GET', 'api/share_users');
	}

	public async refreshShareInvitations() {
		const result = await this.shareInvitations();

		this.dispatch({
			type: 'SHARE_INVITATION_SET',
			shareInvitations: result.items,
		});
	}

	public async refreshShares() {
		const result = await this.shares();

		this.dispatch({
			type: 'SHARE_SET',
			shares: result.items,
		});
	}

	public async refreshShareUsers(shareId:string) {
		const result = await this.shareUsers(shareId);

		this.dispatch({
			type: 'SHARE_USER_SET',
			shareId: shareId,
			shareUsers: result.items,
		});
	}

	public async runInBackground() {
		if (this.isRunningInBackground_) return;
		this.isRunningInBackground_ = true;

		logger.info(`Starting background service...`);

		if (this.enabled) {
			await this.refreshShareInvitations();
			await this.refreshShares();
		}

		shim.setTimeout(() => {
			if (this.enabled) void this.refreshShareInvitations();
		}, 1000 * 60);
	}

}