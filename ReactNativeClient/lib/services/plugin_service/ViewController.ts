export default class ViewController {

	private id_:string = `view_${Math.random()}`;
	private pluginId_:string;
	private store_:any;

	constructor(pluginId:string, store:any) {
		this.pluginId_ = pluginId;
		this.store_ = store;
	}

	protected get storeView():any {
		return this.store_.pluginService.plugins[this.pluginId_].views[this.id];
	}

	protected get store():any {
		return this.store_;
	}

	public get pluginId():string {
		return this.pluginId_;
	}

	public get key():string {
		return this.id_;
	}

	public get id():string {
		return this.id_;
	}

	public get type():string {
		throw new Error('Must be overriden');
	}

	public emitMessage(event:any) {
		console.info('Calling ViewController.emitMessage - but not implemented', event);
	}

}
