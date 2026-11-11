import { Store } from 'redux';
import { ViewHandle } from './utils/createViewHandle';

export interface EmitMessageEvent {
	message: unknown;
}

// State shape varies between desktop (AppState with mainLayout) and mobile; subclasses access fields not present on the base lib State.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Store state is heterogeneous across desktop/mobile callers
export type PluginStore = Store<any>;

export default class ViewController {

	private handle_: ViewHandle;
	private pluginId_: string;
	private store_: PluginStore;

	public constructor(handle: ViewHandle, pluginId: string, store: PluginStore) {
		this.handle_ = handle;
		this.pluginId_ = pluginId;
		this.store_ = store;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- View shape varies by controller subtype (menu, panel, dialog, toolbar button); subclasses index into different fields
	protected get storeView(): any {
		return this.store_.getState().pluginService.plugins[this.pluginId_].views[this.handle];
	}

	protected get store(): PluginStore {
		return this.store_;
	}

	public get pluginId(): string {
		return this.pluginId_;
	}

	public get key(): string {
		return this.handle_;
	}

	public get handle(): ViewHandle {
		return this.handle_;
	}

	public get type(): string {
		throw new Error('Must be overriden');
	}

	public async emitMessage(event: EmitMessageEvent): Promise<unknown> {
		console.warn('Calling ViewController.emitMessage - but not implemented', event);
		return undefined;
	}

	public postMessage(message: unknown) {
		console.warn('Calling ViewController.postMessage - but not implemented', message);
	}

}
