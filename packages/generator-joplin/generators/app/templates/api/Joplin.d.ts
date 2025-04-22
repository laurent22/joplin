import Plugin from '../Plugin';
import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinFilters from './JoplinFilters';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinInterop from './JoplinInterop';
import JoplinSettings from './JoplinSettings';
import JoplinContentScripts from './JoplinContentScripts';
import JoplinClipboard from './JoplinClipboard';
import JoplinWindow from './JoplinWindow';
import BasePlatformImplementation from '../BasePlatformImplementation';
import JoplinImaging from './JoplinImaging';
/**
 * This is the main entry point to the Joplin API. You can access various services using the provided accessors.
 *
 * The API is now relatively stable and in general maintaining backward compatibility is a top priority, so you shouldn't except much breakages.
 *
 * If a breaking change ever becomes needed, best effort will be done to:
 *
 * - Deprecate features instead of removing them, so as to give you time to fix the issue;
 * - Document breaking changes in the changelog;
 *
 * So if you are developing a plugin, please keep an eye on the changelog as everything will be in there with information about how to update your code.
 */
export default class Joplin {
    private data_;
    private plugins_;
    private imaging_;
    private workspace_;
    private filters_;
    private commands_;
    private views_;
    private interop_;
    private settings_;
    private contentScripts_;
    private clipboard_;
    private window_;
    private implementation_;
    constructor(implementation: BasePlatformImplementation, plugin: Plugin, store: any);
    get data(): JoplinData;
    get clipboard(): JoplinClipboard;
    get imaging(): JoplinImaging;
    get window(): JoplinWindow;
    get plugins(): JoplinPlugins;
    get workspace(): JoplinWorkspace;
    get contentScripts(): JoplinContentScripts;
    /**
     * @ignore
     *
     * Not sure if it's the best way to hook into the app
     * so for now disable filters.
     */
    get filters(): JoplinFilters;
    get commands(): JoplinCommands;
    get views(): JoplinViews;
    get interop(): JoplinInterop;
    get settings(): JoplinSettings;
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
     *
     * <span class="platform-desktop">desktop</span>
     */
    require(_path: string): any;
    versionInfo(): Promise<import("./types").VersionInfo>;
    /**
     * Tells whether the current theme is a dark one or not.
     */
    shouldUseDarkColors(): Promise<boolean>;
}
