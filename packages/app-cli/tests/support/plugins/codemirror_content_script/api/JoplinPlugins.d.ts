import Plugin from '../Plugin';
import { ContentScriptType, Script } from './types';
/**
 * This class provides access to plugin-related features.
 */
export default class JoplinPlugins {
    private plugin;
    constructor(plugin: Plugin);
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
    /**
     * @deprecated Use joplin.contentScripts.register()
     */
    registerContentScript(type: ContentScriptType, id: string, scriptPath: string): Promise<void>;
}
