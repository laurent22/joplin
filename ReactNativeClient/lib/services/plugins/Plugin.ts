import { PluginManifest } from './utils/types';
import ViewController from './ViewController';
import shim from 'lib/shim';
import { ViewHandle } from './utils/createViewHandle';

interface ViewControllers {
	[key:string]: ViewController
}

export default class Plugin {

	private id_:string;
	private baseDir_:string;
	private manifest_:PluginManifest;
	private scriptText_:string;
	private enabled_:boolean = true;
	// @ts-ignore Should be useful later on
	private logger_:any = null;
	private viewControllers_:ViewControllers = {};

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

	public addViewController(v:ViewController) {
		if (this.viewControllers_[v.handle]) throw new Error(`View already added: ${v.handle}`);
		this.viewControllers_[v.handle] = v;
	}

	public viewController(handle:ViewHandle):ViewController {
		if (!this.viewControllers_[handle]) throw new Error(`View not found: ${handle}`);
		return this.viewControllers_[handle];
	}

}
