export enum PluginPermission {
	Model = 'model',
}

export interface PluginManifest {
	manifest_version: number,
	name: string,
	version: string,
	description?: string,
	homepage_url?: string,
	permissions?: PluginPermission[],
}

export interface Plugin {
	id: string,
	manifest: PluginManifest,
	scriptText: string,
	baseDir: string,
	controls: any, // TODO: don't use any
}

export interface SandboxJoplinApi {
	get(path:string, query:any):any;
	post(path:string, query:any, body:any, files:any[]):any;
	put(path:string, query:any, body:any, files:any[]):any;
	delete(path:string, query:any):any;
}

export interface SandboxJoplinPlugins {
	register(script:any):void;
}

export interface SandboxJoplinFilters {
	on(name:string, callback:Function):void;
	off(name:string, callback:Function):void;
}

export interface SandboxJoplinEvents {
	on(name:string, callback:Function):void;
	off(name:string, callback:Function):void;
}

export interface SandboxJoplinViews {
	createWebviewPanel(options:any):any; // TODO: Should return an instance of ViewController
}

export interface SandboxJoplin {
	api: SandboxJoplinApi,
	plugins: SandboxJoplinPlugins,
	filters: SandboxJoplinFilters,
	events: SandboxJoplinEvents,
	views: SandboxJoplinViews,
}

export interface SandboxConsole {
	debug: Function,
	log: Function,
	info: Function,
	warn: Function,
	error: Function,
}

export interface Sandbox {
	joplin: SandboxJoplin,
	console: SandboxConsole,
	require: Function,
	setTimeout: Function,
	setInterval: Function,
}

export interface SandboxContextRuntime {
	onStart(event:any):void;
	onMessage(event:any):void;
}

export interface SandboxContext {
	runtime:SandboxContextRuntime;
}
