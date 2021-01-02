import { ViewHandle } from './utils/createViewHandle';

export default class ViewController {

	private handle_: ViewHandle;
	private pluginId_: string;
	private store_: any;

	public constructor(handle: ViewHandle, pluginId: string, store: any) {
		this.handle_ = handle;
		this.pluginId_ = pluginId;
		this.store_ = store;
	}

	protected get storeView(): any {
		return this.store_.getState().pluginService.plugins[this.pluginId_].views[this.handle];
	}

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

	public emitMessage(event: any) {
		console.info('Calling ViewController.emitMessage - but not implemented', event);
	}

}
