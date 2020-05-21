import * as vm from 'vm';
const Api = require('lib/services/rest/Api');

interface Plugin {
	id: string,
	script: string,
}

class SandboxService {

	public api:any;

	constructor() {
		this.api = new Api();
	}

	public newSandbox() {
		// that:SandboxService
		return (() => {
			const requireWhiteList:string[] = [
				// 'lib/models/Note',
				// 'lib/models/Folder',
			];

			function serializeApiBody(body:any) {
				if (typeof body !== 'string') return JSON.stringify(body);
				return body;
			}

			return {
				joplin: {
					model: {
						get: (path:string, query:any = null) => {
							return this.api.route('GET', path, query);
						},
						post: (path:string, query:any = null, body:any = null, files:any[] = null) => {
							return this.api.route('POST', path, query, serializeApiBody(body), files);
						},
						put: (path:string, query:any = null, body:any = null, files:any[] = null) => {
							return this.api.route('PUT', path, query, serializeApiBody(body), files);
						},
						delete: (path:string, query:any = null) => {
							return this.api.route('DELETE', path, query);
						},
					},
				},
				console: console,
				require: function(path:string):any {
					if (!requireWhiteList.includes(path)) throw new Error(`Cannot access this module: ${path}`);
					return require(path);
				},
			};
		})();
	}

}

export default class PluginService {

	private static instance_:PluginService = null;

	public static instance():PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private sandboxService:SandboxService;

	constructor() {
		this.sandboxService = new SandboxService();
	}

	logger() {
		return {
			error: console.error,
			info: console.info,
		};
	}

	async runPlugin(plugin:Plugin) {
		const sandbox = this.sandboxService.newSandbox();

		vm.createContext(sandbox);

		const result = vm.runInContext(plugin.script, sandbox);

		if (result.run) {
			const startTime = Date.now();

			try {
				this.logger().info(`Starting plugin: ${plugin.id}`);
				await result.run(null);
			} catch (error) {
				// For some reason, error thrown from the executed script do not have the type "Error"
				// but are instead plain object. So recreate the Error object here so that it can
				// be handled correctly by loggers, etc.
				const newError:Error = new Error(error.message);
				newError.stack = error.stack;
				this.logger().error(plugin.id, `In plugin ${plugin.id}:`, newError);
			}

			this.logger().info(`Finished plugin: ${plugin.id} (Took ${Date.now() - startTime}ms)`);
		}
	}

}
