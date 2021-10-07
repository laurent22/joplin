import ViewController, { EmitMessageEvent } from './ViewController';
import shim from '../../shim';
import { ButtonSpec, DialogResult, ViewHandle } from './api/types';
const { toSystemSlashes } = require('../../path-utils');
import PostMessageService, { MessageParticipant } from '../PostMessageService';

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

// TODO: Copied from:
// packages/app-desktop/gui/ResizableLayout/utils/findItemByKey.ts
function findItemByKey(layout: any, key: string): any {
	if (!layout) throw new Error('Layout cannot be null');

	function recurseFind(item: any): any {
		if (item.key === key) return item;

		if (item.children) {
			for (const child of item.children) {
				const found = recurseFind(child);
				if (found) return found;
			}
		}
		return null;
	}

	return recurseFind(layout);
}

export default class WebviewController extends ViewController {

	private baseDir_: string;
	private messageListener_: Function = null;
	private closeResponse_: CloseResponse = null;

	public constructor(handle: ViewHandle, pluginId: string, store: any, baseDir: string, containerType: ContainerType) {
		super(handle, pluginId, store);
		this.baseDir_ = toSystemSlashes(baseDir, 'linux');

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.handle,
				type: this.type,
				containerType: containerType,
				html: '',
				scripts: [],
				opened: false,
				buttons: null,
				fitToContent: true,
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

	public postMessage(message: any) {

		const messageId = `plugin_${Date.now()}${Math.random()}`;

		void PostMessageService.instance().postMessage({
			pluginId: this.pluginId,
			viewId: this.handle,
			contentScriptId: null,
			from: MessageParticipant.Plugin,
			to: MessageParticipant.UserWebview,
			id: messageId,
			content: message,
		});

	}

	public async emitMessage(event: EmitMessageEvent): Promise<any> {

		if (!this.messageListener_) return;
		return this.messageListener_(event.message);
	}

	public onMessage(callback: any) {
		this.messageListener_ = callback;
	}

	// ---------------------------------------------
	// Specific to panels
	// ---------------------------------------------

	public async show(show: boolean = true): Promise<void> {
		this.store.dispatch({
			type: 'MAIN_LAYOUT_SET_ITEM_PROP',
			itemKey: this.handle,
			propName: 'visible',
			propValue: show,
		});
	}

	public async hide(): Promise<void> {
		return this.show(false);
	}

	public get visible(): boolean {
		const mainLayout = this.store.getState().mainLayout;
		const item = findItemByKey(mainLayout, this.handle);
		return item ? item.visible : false;
	}

	// ---------------------------------------------
	// Specific to dialogs
	// ---------------------------------------------

	public async open(): Promise<DialogResult> {
		this.store.dispatch({
			type: 'VISIBLE_DIALOGS_ADD',
			name: this.handle,
		});

		this.setStoreProp('opened', true);

		return new Promise((resolve: Function, reject: Function) => {
			this.closeResponse_ = { resolve, reject };
		});
	}

	public close() {
		this.store.dispatch({
			type: 'VISIBLE_DIALOGS_REMOVE',
			name: this.handle,
		});

		this.setStoreProp('opened', false);
	}

	public closeWithResponse(result: DialogResult) {
		this.close();
		this.closeResponse_.resolve(result);
	}

	public get buttons(): ButtonSpec[] {
		return this.storeView.buttons;
	}

	public set buttons(buttons: ButtonSpec[]) {
		this.setStoreProp('buttons', buttons);
	}

	public get fitToContent(): boolean {
		return this.storeView.fitToContent;
	}

	public set fitToContent(fitToContent: boolean) {
		this.setStoreProp('fitToContent', fitToContent);
	}
}
