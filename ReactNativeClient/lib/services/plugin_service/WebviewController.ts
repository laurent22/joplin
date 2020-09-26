import ViewController from './ViewController';
const shim = require('lib/shim');
const { toSystemSlashes } = require('lib/path-utils');

export default class WebviewController extends ViewController {

	private baseDir_:string;
	private messageListener_:Function = null;

	constructor(id:string, pluginId:string, store:any, baseDir:string) {
		super(id, pluginId, store);
		this.baseDir_ = toSystemSlashes(baseDir, 'linux');

		this.store.dispatch({
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

	public get type():string {
		return 'webview';
	}

	public get html():string {
		return this.storeView.html;
	}

	public set html(html:string) {
		this.store.dispatch({
			type: 'PLUGIN_VIEW_PROP_SET',
			pluginId: this.pluginId,
			id: this.id,
			name: 'html',
			value: html,
		});
	}

	public addScript(path:string) {
		const fullPath = toSystemSlashes(shim.fsDriver().resolve(`${this.baseDir_}/${path}`), 'linux');

		if (fullPath.indexOf(this.baseDir_) !== 0) throw new Error(`Script appears to be outside of plugin base directory: ${fullPath} (Base dir: ${this.baseDir_})`);

		this.store.dispatch({
			type: 'PLUGIN_VIEW_PROP_PUSH',
			pluginId: this.pluginId,
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
