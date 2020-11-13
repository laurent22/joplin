import { PluginManifest } from './utils/types';
import ViewController from './ViewController';
import shim from '../../shim';
import { ViewHandle } from './utils/createViewHandle';
import { ContentScriptType } from './api/types';
import Logger from '../../Logger';
const EventEmitter = require('events');

interface ViewControllers {
	[key: string]: ViewController;
}

export interface ContentScript {
	id: string;
	path: string;
}

interface ContentScripts {
	[type: string]: ContentScript[];
}

export default class Plugin {

	private id_: string;
	private baseDir_: string;
	private manifest_: PluginManifest;
	private scriptText_: string;
	private enabled_: boolean = true;
	private logger_: Logger = null;
	private viewControllers_: ViewControllers = {};
	private contentScripts_: ContentScripts = {};
	private dispatch_: Function;
	private eventEmitter_: any;

	constructor(id: string, baseDir: string, manifest: PluginManifest, scriptText: string, logger: Logger, dispatch: Function) {
		this.id_ = id;
		this.baseDir_ = shim.fsDriver().resolve(baseDir);
		this.manifest_ = manifest;
		this.scriptText_ = scriptText;
		this.logger_ = logger;
		this.dispatch_ = dispatch;
		this.eventEmitter_ = new EventEmitter();
	}

	public get id(): string {
		return this.id_;
	}

	public get enabled(): boolean {
		return this.enabled_;
	}

	public get manifest(): PluginManifest {
		return this.manifest_;
	}

	public get scriptText(): string {
		return this.scriptText_;
	}

	public get baseDir(): string {
		return this.baseDir_;
	}

	public get viewCount(): number {
		return Object.keys(this.viewControllers_).length;
	}

	on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	emit(eventName: string, event: any = null) {
		return this.eventEmitter_.emit(eventName, event);
	}

	public async registerContentScript(type: ContentScriptType, id: string, path: string) {
		if (!this.contentScripts_[type]) this.contentScripts_[type] = [];

		const absolutePath = shim.fsDriver().resolveRelativePathWithinDir(this.baseDir, path);

		if (!(await shim.fsDriver().exists(absolutePath))) throw new Error(`Could not find content script at path ${absolutePath}`);

		this.contentScripts_[type].push({ id, path: absolutePath });

		this.logger_.debug(`Plugin: ${this.id}: Registered content script: ${type}: ${id}: ${absolutePath}`);

		this.dispatch_({
			type: 'PLUGIN_CONTENT_SCRIPTS_ADD',
			pluginId: this.id,
			contentScript: {
				type: type,
				id: id,
				path: absolutePath,
			},
		});
	}

	public contentScriptsByType(type: ContentScriptType): ContentScript[] {
		return this.contentScripts_[type] ? this.contentScripts_[type] : [];
	}

	public addViewController(v: ViewController) {
		if (this.viewControllers_[v.handle]) throw new Error(`View already added or there is already a view with this ID: ${v.handle}`);
		this.viewControllers_[v.handle] = v;
	}

	public viewController(handle: ViewHandle): ViewController {
		if (!this.viewControllers_[handle]) throw new Error(`View not found: ${handle}`);
		return this.viewControllers_[handle];
	}

	public deprecationNotice(goneInVersion: string, message: string) {
		this.logger_.warn(`Plugin: ${this.id}: DEPRECATION NOTICE: ${message} The current feature will stop working in version ${goneInVersion}.`);
	}

}
