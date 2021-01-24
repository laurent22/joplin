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
     * Gets the plugin own data directory path. Use this to store any plugin-related data.
     */
    dataDir(): Promise<string>;
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
    require(_path: string): any;
}
