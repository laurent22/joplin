import Plugin from '../Plugin';
import Logger from '../../../Logger';
import { ContentScriptType, Script } from './types';

const logger = Logger.create('joplin.plugins');

/**
 * This class provides access to plugin-related features.
 */
export default class JoplinPlugins {

	private plugin: Plugin;

	public constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	/**
	 * Registers a new plugin. This is the entry point when creating a plugin. You should pass a simple object with an `onStart` method to it.
	 * That `onStart` method will be executed as soon as the plugin is loaded.
	 *
	 * ```typescript
	 * joplin.plugins.register({
	 *     onStart: async function() {
	 *         // Run your plugin code here
	 *     }
	 * });
	 * ```
	 */
	public async register(script: Script) {
		if (script.onStart) {
			const startTime = Date.now();

			logger.info(`Starting plugin: ${this.plugin.id}`);

			// We don't use `await` when calling onStart because the plugin might be awaiting
			// in that call too (for example, when opening a dialog on startup) so we don't
			// want to get stuck here.
			void script.onStart({}).catch((error: any) => {
				// For some reason, error thrown from the executed script do not have the type "Error"
				// but are instead plain object. So recreate the Error object here so that it can
				// be handled correctly by loggers, etc.
				const newError: Error = new Error(error.message);
				newError.stack = error.stack;
				logger.error(`Uncaught exception in plugin "${this.plugin.id}":`, newError);
			}).then(() => {
				logger.info(`Finished running onStart handler: ${this.plugin.id} (Took ${Date.now() - startTime}ms)`);
				this.plugin.emit('started');
			});
		}
	}

	/**
	 * @deprecated Use joplin.contentScripts.register()
	 */
	public async registerContentScript(type: ContentScriptType, id: string, scriptPath: string) {
		this.plugin.deprecationNotice('1.8', 'joplin.plugins.registerContentScript() is deprecated in favour of joplin.contentScripts.register()');
		return this.plugin.registerContentScript(type, id, scriptPath);
	}

	/**
	 * Gets the plugin own data directory path. Use this to store any plugin-related data.
	 */
	public async dataDir(): Promise<string> {
		return this.plugin.dataDir();
	}

	/**
	 * It is not possible to bundle native packages with a plugin, because they
	 * need to work cross-platforms. Instead access to certain useful native
	 * packages is provided using this function.
	 *
	 * Currently these packages are available:
	 *
	 * - [sqlite3](https://www.npmjs.com/package/sqlite3)
	 * - [fs-extra](https://www.npmjs.com/package/fs-extra)
	 *
	 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/nativeModule)
	 */
	public require(_path: string): any {
		// Just a stub. Implementation has to be done within plugin process, in plugin_index.js
	}

}
