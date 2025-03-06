import ViewController, { EmitMessageEvent } from './ViewController';
import shim from '../../shim';
import { ButtonSpec, DialogResult, ViewHandle } from './api/types';
const { toSystemSlashes } = require('../../path-utils');
import PostMessageService, { MessageParticipant } from '../PostMessageService';
import { PluginViewState } from './reducer';
import { defaultWindowId } from '../../reducer';
import Logger from '@joplin/utils/Logger';
import CommandService from '../CommandService';

const logger = Logger.create('WebviewController');

export enum ContainerType {
	Panel = 'panel',
	Dialog = 'dialog',
	Editor = 'editor',
}

export interface Options {
	containerType: ContainerType;
}

interface CloseResponse {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	resolve: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	reject: Function;
}

// TODO: Copied from:
// packages/app-desktop/gui/ResizableLayout/utils/findItemByKey.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function findItemByKey(layout: any, key: string): any {
	if (!layout) throw new Error('Layout cannot be null');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private messageListener_: Function = null;
	private updateListener_: ()=> void = null;
	private closeResponse_: CloseResponse = null;
	private containerType_: ContainerType = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(handle: ViewHandle, pluginId: string, store: any, baseDir: string, containerType: ContainerType) {
		super(handle, pluginId, store);
		this.baseDir_ = toSystemSlashes(baseDir, 'linux');
		this.containerType_ = containerType;

		const view: PluginViewState = {
			id: this.handle,
			type: this.type,
			containerType: containerType,
			html: '',
			scripts: [],
			// Opened is used for dialogs and mobile panels (which are shown
			// like dialogs):
			opened: containerType === ContainerType.Panel,
			buttons: null,
			fitToContent: true,
		};

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view,
		});
	}

	public get type(): string {
		return 'webview';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public postMessage(message: any) {

		const messageId = `plugin_${Date.now()}${Math.random()}`;

		void PostMessageService.instance().postMessage({
			pluginId: this.pluginId,
			viewId: this.handle,
			windowId: defaultWindowId,
			contentScriptId: null,
			from: MessageParticipant.Plugin,
			to: MessageParticipant.UserWebview,
			id: messageId,
			content: message,
		});

	}

	public async emitMessage(event: EmitMessageEvent) {
		if (!this.messageListener_) return;

		if (this.containerType_ === ContainerType.Editor && !this.isActive()) {
			logger.info('emitMessage: Not emitting message because editor is disabled:', this.pluginId, this.handle);
			return;
		}

		return this.messageListener_(event.message);
	}

	public emitUpdate() {
		if (!this.updateListener_) return;

		if (this.containerType_ === ContainerType.Editor && (!this.isActive() || !this.isVisible())) {
			logger.info('emitMessage: Not emitting update because editor is disabled or hidden:', this.pluginId, this.handle, this.isActive(), this.isVisible());
			return;
		}

		this.updateListener_();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onMessage(callback: any) {
		this.messageListener_ = callback;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onUpdate(callback: any) {
		this.updateListener_ = callback;
	}

	// ---------------------------------------------
	// Specific to panels
	// ---------------------------------------------

	private showWithAppLayout() {
		return this.containerType === ContainerType.Panel && !!this.store.getState().mainLayout;
	}

	public async show(show = true): Promise<void> {
		if (this.showWithAppLayout()) {
			this.store.dispatch({
				type: 'MAIN_LAYOUT_SET_ITEM_PROP',
				itemKey: this.handle,
				propName: 'visible',
				propValue: show,
			});
		} else {
			this.setStoreProp('opened', show);
		}
	}

	public async hide(): Promise<void> {
		return this.show(false);
	}

	public get visible(): boolean {
		const appState = this.store.getState();

		// Mobile: There is no appState.mainLayout
		if (!this.showWithAppLayout()) {
			return this.storeView.opened;
		}

		const mainLayout = appState.mainLayout;
		const item = findItemByKey(mainLayout, this.handle);
		return item ? item.visible : false;
	}

	// ---------------------------------------------
	// Specific to dialogs
	// ---------------------------------------------

	public async open(): Promise<DialogResult> {
		if (this.closeResponse_) {
			this.closeResponse_.resolve(null);
			this.closeResponse_ = null;
		}

		this.store.dispatch({
			type: 'VISIBLE_DIALOGS_ADD',
			name: this.handle,
		});

		this.setStoreProp('opened', true);

		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
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
		this.closeResponse_ = null;
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

	// ---------------------------------------------
	// Specific to editors
	// ---------------------------------------------

	public setActive(active: boolean) {
		this.setStoreProp('opened', active);
	}

	public isActive(): boolean {
		return this.storeView.opened;
	}

	public isVisible(): boolean {
		if (!this.storeView.opened) return false;
		const shownEditorViewIds: string[] = this.store.getState().settings['plugins.shownEditorViewIds'];
		return shownEditorViewIds.includes(this.handle);
	}

	public async setVisible(visible: boolean) {
		await CommandService.instance().execute('showEditorPlugin', this.handle, visible);
	}

}
