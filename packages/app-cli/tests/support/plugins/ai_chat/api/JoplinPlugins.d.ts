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
    /**
     * Gets the plugin own data directory path. Use this to store any
     * plugin-related data. Unlike [[installationDir]], any data stored here
     * will be persisted.
     */
    dataDir(): Promise<string>;
    /**
     * Gets the plugin installation directory. This can be used to access any
     * asset that was packaged with the plugin. This directory should be
     * considered read-only because any data you store here might be deleted or
     * re-created at any time. To store new persistent data, use [[dataDir]].
     */
    installationDir(): Promise<string>;
    /**
     * @deprecated Use joplin.require()
     */
    require(_path: string): any;
}
