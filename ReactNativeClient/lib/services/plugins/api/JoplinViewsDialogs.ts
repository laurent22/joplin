import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ButtonSpec, ViewHandle } from './types';

export default class JoplinViewsDialogs {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle:ViewHandle):WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	async create() {
		const handle = createViewHandle(this.plugin);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir);
		controller.containerType = ContainerType.Dialog;
		this.plugin.addViewController(controller);
		return handle;
	}

	async setHtml(handle:ViewHandle, html:string) {
		return this.controller(handle).html = html;
	}

	async setButtons(handle:ViewHandle, buttons:ButtonSpec[]) {
		return this.controller(handle).buttons = buttons;
	}

	async open(handle:ViewHandle) {
		return this.controller(handle).open();
	}

}
