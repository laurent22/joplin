import { ViewHandle } from './utils/createViewHandle';

export interface EmitMessageEvent {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	message: any;
}

export default class ViewController {

	private handle_: ViewHandle;
	private pluginId_: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(handle: ViewHandle, pluginId: string, store: any) {
		this.handle_ = handle;
		this.pluginId_ = pluginId;
		this.store_ = store;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected get storeView(): any {
		return this.store_.getState().pluginService.plugins[this.pluginId_].views[this.handle];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected get store(): any {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async emitMessage(event: EmitMessageEvent): Promise<any> {
		console.warn('Calling ViewController.emitMessage - but not implemented', event);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public postMessage(message: any) {
		console.warn('Calling ViewController.postMessage - but not implemented', message);
	}

}
