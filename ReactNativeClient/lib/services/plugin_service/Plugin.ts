import { PluginManifest } from './utils/types';
const { shim } = require('lib/shim');

export default class Plugin {

	private id_:string;
	private baseDir_:string;
	private manifest_:PluginManifest;
	private scriptText_:string;
	private enabled_:boolean = true;
	private context_:any = null;
	private logger_:any = null;

	constructor(id:string, baseDir:string, manifest:PluginManifest, scriptText:string, logger:any) {
		this.id_ = id;
		this.baseDir_ = shim.fsDriver().resolve(baseDir);
		this.manifest_ = manifest;
		this.scriptText_ = scriptText;
		this.logger_ = logger;
	}

	public get id():string {
		return this.id_;
	}

	public get enabled():boolean {
		return this.enabled_;
	}

	public get manifest():PluginManifest {
		return this.manifest_;
	}

	public get scriptText():string {
		return this.scriptText_;
	}

	public get baseDir():string {
		return this.baseDir_;
	}

	public get context():any {
		return this.context_;
	}

	public set context(v:any) {
		this.context_ = v;
	}

	public onMessage(event:any) {
		this.logger_.debug(`Plugin ${this.id}: Got message: `, event);

		if (!this.context) {
			this.logger_.warn(`Plugin ${this.id}: Got message but no context is defined. Message: `, event);
			return;
		}

		if (!this.context.runtime.onMessage) {
			this.logger_.warn(`Plugin ${this.id}: Got message but onMessage() handler is not defined. Message: `, event);
			return;
		}

		this.context.runtime.onMessage(event.message);
	}

}
