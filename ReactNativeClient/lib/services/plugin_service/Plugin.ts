import { PluginManifest } from './utils/types';
const { shim } = require('lib/shim');

export default class Plugin {

	private id_:string;
	private baseDir_:string;
	private manifest_:PluginManifest;
	private scriptText_:string;
	private script_:any;
	private enabled_:boolean = true;

	constructor(id:string, baseDir:string, manifest:PluginManifest, scriptText:string) {
		this.id_ = id;
		this.baseDir_ = shim.fsDriver().resolve(baseDir);
		this.manifest_ = manifest;
		this.scriptText_ = scriptText;
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

	public get script():any {
		return this.script_;
	}

	public set script(v:any) {
		this.script_ = v;
	}

	public get baseDir():string {
		return this.baseDir_;
	}

}
