import ViewController from './ViewController';
import shim from '../../shim';
import { ButtonId, ButtonSpec } from './api/types';
const { toSystemSlashes } = require('../../path-utils');

export enum ContainerType {
	Panel = 'panel',
	Dialog = 'dialog',
}

export interface Options {
	containerType: ContainerType;
}

interface CloseResponse {
	resolve: Function;
	reject: Function;
}

export default class WebviewController extends ViewController {

	private baseDir_: string;
	private messageListener_: Function = null;
	private closeResponse_: CloseResponse = null;

	constructor(id: string, pluginId: string, store: any, baseDir: string) {
		super(id, pluginId, store);
		this.baseDir_ = toSystemSlashes(baseDir, 'linux');

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.handle,
				type: this.type,
				containerType: ContainerType.Panel,
				html: '',
				scripts: [],
				opened: false,
				buttons: null,
			},
		});
	}

	public get type(): string {
		return 'webview';
	}

	private setStoreProp(name: string, value: any) {
		this.store.dispatch({
			type: 'PLUGIN_VIEW_PROP_SET',
			pluginId: this.pluginId,
			id: this.handle,
			name: name,
			value: value,
		});
	}

	public get html(): string {
		return this.storeView.html;
	}

	public set html(html: string) {
		this.setStoreProp('html', html);
	}

	public get containerType(): ContainerType {
		return this.storeView.containerType;
	}

	public set containerType(containerType: ContainerType) {
		this.setStoreProp('containerType', containerType);
	}

	public async addScript(path: string) {
		const fullPath = toSystemSlashes(shim.fsDriver().resolve(`${this.baseDir_}/${path}`), 'linux');

		if (fullPath.indexOf(this.baseDir_) !== 0) throw new Error(`Script appears to be outside of plugin base directory: ${fullPath} (Base dir: ${this.baseDir_})`);

		this.store.dispatch({
			type: 'PLUGIN_VIEW_PROP_PUSH',
			pluginId: this.pluginId,
			id: this.handle,
			name: 'scripts',
			value: fullPath,
		});
	}

	public emitMessage(event: any) {
		if (!this.messageListener_) return;
		this.messageListener_(event.message);
	}

	public onMessage(callback: any) {
		this.messageListener_ = callback;
	}

	// ---------------------------------------------
	// Specific to dialogs
	// ---------------------------------------------

	public async open(): Promise<ButtonId> {
		this.setStoreProp('opened', true);

		return new Promise((resolve: Function, reject: Function) => {
			this.closeResponse_ = { resolve, reject };
		});
	}

	public async close() {
		this.setStoreProp('opened', false);
	}

	public closeWithResponse(result: ButtonId) {
		this.close();
		this.closeResponse_.resolve(result);
	}

	public get buttons(): ButtonSpec[] {
		return this.storeView.buttons;
	}

	public set buttons(buttons: ButtonSpec[]) {
		this.setStoreProp('buttons', buttons);
	}

}
