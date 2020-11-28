import Plugin from '../Plugin';
import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinFilters from './JoplinFilters';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinInterop from './JoplinInterop';
import JoplinSettings from './JoplinSettings';
/**
 * This is the main entry point to the Joplin API. You can access various services using the provided accessors.
 *
 * **This is a beta API**
 *
 * Please note that the plugin API is relatively new and should be considered Beta state. Besides possible bugs, what it means is that there might be necessary breaking changes from one version to the next. Whenever such change is needed, best effort will be done to:
 *
 * - Maintain backward compatibility;
 * - When possible, deprecate features instead of removing them;
 * - Document breaking changes in the changelog;
 *
 * So if you are developing a plugin, please keep an eye on the changelog as everything will be in there with information about how to update your code. There won't be any major API rewrite or architecture changes, but possibly small tweaks like function signature change, type change, etc.
 *
 * Eventually, the plugin API will be versioned to make this process smoother.
 */
export default class Joplin {
    private data_;
    private plugins_;
    private workspace_;
    private filters_;
    private commands_;
    private views_;
    private interop_;
    private settings_;
    constructor(implementation: any, plugin: Plugin, store: any);
    get data(): JoplinData;
    get plugins(): JoplinPlugins;
    get workspace(): JoplinWorkspace;
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
}
