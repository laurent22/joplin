const { shim } = require('lib/shim');
const { toSystemSlashes } = require('lib/path-utils');

export default class WebviewController {

	private id_:string = `webview_${Math.random()}`;
	private pluginId_:string;
	private baseDir_:string;
	private store_:any;
	private messageListener_:Function = null;

	constructor(pluginId:string, baseDir:string, store:any) {
		this.pluginId_ = pluginId;
		this.baseDir_ = toSystemSlashes(baseDir, 'linux');
		this.store_ = store;

		this.store_.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.id,
				type: this.type,
				html: '',
				scripts: [],
			},
		});
	}

	private get storeView():any {
		return this.store_.pluginSystem.plugins[this.pluginId_].views[this.id];
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
		return this.storeView.html;
	}

	public set html(html:string) {
		this.store_.dispatch({
			type: 'PLUGIN_VIEW_PROP_SET',
			pluginId: this.pluginId_,
			id: this.id,
			name: 'html',
			value: html,
		});
	}

	public addScript(path:string) {
		const fullPath = toSystemSlashes(shim.fsDriver().resolve(`${this.baseDir_}/${path}`), 'linux');

		if (fullPath.indexOf(this.baseDir_) !== 0) throw new Error(`Script appears to be outside of plugin base directory: ${fullPath} (Base dir: ${this.baseDir_})`);

		this.store_.dispatch({
			type: 'PLUGIN_VIEW_PROP_PUSH',
			pluginId: this.pluginId_,
			id: this.id,
			name: 'scripts',
			value: fullPath,
		});
	}

	public emitMessage(event:any) {
		if (!this.messageListener_) return;
		this.messageListener_(event.message);
	}

	public onMessage(callback:any) {
		this.messageListener_ = callback;
	}

}
