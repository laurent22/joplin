import Plugin from '../Plugin';
import Logger from 'lib/Logger';
import { Script } from './types';

/**
 * This class provides access to plugin-related features.
 */
export default class JoplinPlugins {

	private logger: Logger;
	private plugin: Plugin;

	constructor(logger:Logger, plugin:Plugin) {
		this.logger = logger;
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
	async register(script: Script) {
		if (script.onStart) {
			const startTime = Date.now();

			this.logger.info(`Starting plugin: ${this.plugin.id}`);

			// We don't use `await` when calling onStart because the plugin might be awaiting
			// in that call too (for example, when opening a dialog on startup) so we don't
			// want to get stuck here.
			script.onStart({}).catch((error:any) => {
				// For some reason, error thrown from the executed script do not have the type "Error"
				// but are instead plain object. So recreate the Error object here so that it can
				// be handled correctly by loggers, etc.
				const newError:Error = new Error(error.message);
				newError.stack = error.stack;
				this.logger.error(`In plugin ${this.plugin.id}:`, newError);
			}).then(() => {
				this.logger.info(`Finished running onStart handler: ${this.plugin.id} (Took ${Date.now() - startTime}ms)`);
			});
		}
	}
}
