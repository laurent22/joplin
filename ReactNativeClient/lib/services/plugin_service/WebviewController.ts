export default class WebviewController {

	private id_:string = `webview_${Math.random()}`;
	private html_:string = '';
	private pluginId_:string;
	private store_:any;

	constructor(pluginId:string, store:any) {
		this.pluginId_ = pluginId;
		this.store_ = store;
	}

	public get key():string {
		return this.id_;
	}

	public get id():string {
		return this.id_;
	}

	public get type():string {
		return 'webview';
	}

	public get html():string {
		return this.html_;
	}

	public set html(v:string) {
		this.html_ = v;

		this.store_.dispatch({
			type: 'PLUGIN_CONTROL_PROP_SET',
			pluginId: this.pluginId_,
			id: this.id,
			name: 'html',
			value: this.html_,
		});
	}

	public toObject() {
		return {
			id: this.id,
			type: this.type,
			html: this.html,
		};
	}

}
