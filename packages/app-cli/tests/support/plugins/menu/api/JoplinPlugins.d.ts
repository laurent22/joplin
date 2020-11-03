import Plugin from '../Plugin';
import Logger from 'lib/Logger';
import { Script } from './types';
/**
 * This class provides access to plugin-related features.
 */
export default class JoplinPlugins {
    private logger;
    private plugin;
    constructor(logger: Logger, plugin: Plugin);
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
    register(script: Script): Promise<void>;
}
