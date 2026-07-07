import Plugin from '../Plugin';
import { ContentScriptType } from './types';
export default class JoplinContentScripts {
    private plugin;
    constructor(plugin: Plugin);
    /**
     * Registers a new content script. Unlike regular plugin code, which runs in
     * a separate process, content scripts run within the main process code and
     * thus allow improved performances and more customisations in specific
     * cases. It can be used for example to load a Markdown or editor plugin.
     *
     * Note that registering a content script in itself will do nothing - it
     * will only be loaded in specific cases by the relevant app modules (eg.
     * the Markdown renderer or the code editor). So it is not a way to inject
     * and run arbitrary code in the app, which for safety and performance
     * reasons is not supported.
     *
     * The plugin generator provides a way to build any content script you might
     * want to package as well as its dependencies. See the [Plugin Generator
     * doc](https://github.com/laurent22/joplin/blob/dev/packages/generator-joplin/README.md)
     * for more information.
     *
     * * [View the renderer demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/content_script)
     * * [View the editor demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/codemirror_content_script)
     *
     * See also the [postMessage demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/post_messages)
     *
     * @param type Defines how the script will be used. See the type definition for more information about each supported type.
     * @param id A unique ID for the content script.
     * @param scriptPath Must be a path relative to the plugin main script. For example, if your file content_script.js is next to your index.ts file, you would set `scriptPath` to `"./content_script.js`.
     */
    register(type: ContentScriptType, id: string, scriptPath: string): Promise<void>;
    /**
     * Listens to a messages sent from the content script using postMessage().
     * See {@link ContentScriptType} for more information as well as the
     * [postMessage
     * demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/post_messages)
     */
    onMessage(contentScriptId: string, callback: any): Promise<void>;
}
