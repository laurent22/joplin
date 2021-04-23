import JoplinServerApi from "../../JoplinServerApi";
import Setting from "../../models/Setting";

export default class ShareService {

	private static instance_: ShareService;
	private api_:JoplinServerApi = null;
	private dispatch_:Function = null;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(dispatch:Function) {
		this.dispatch_ = dispatch;
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

}