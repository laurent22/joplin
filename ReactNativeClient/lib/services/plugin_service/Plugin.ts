import { PluginManifest } from './utils/types';
const { shim } = require('lib/shim');

export default class Plugin {

	private id_:string;
	private baseDir_:string;
	private manifest_:PluginManifest;
	private scriptText_:string;
	private enabled_:boolean = true;
	private context_:any = null;
	// @ts-ignore Should be useful later on
	private logger_:any = null;
	private viewControllers_:any = {};

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

	public addViewController(v:any) {
		if (this.viewControllers_[v.id]) throw new Error(`View already added: ${v.id}`);
		this.viewControllers_[v.id] = v;
	}

	public viewControllerById(id:string) {
		if (!this.viewControllers_[id]) throw new Error(`View not found: ${id}`);
		return this.viewControllers_[id];
	}

}
