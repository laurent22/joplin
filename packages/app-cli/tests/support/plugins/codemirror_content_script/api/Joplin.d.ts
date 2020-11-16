import Plugin from '../Plugin';
import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinFilters from './JoplinFilters';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinInterop from './JoplinInterop';
import JoplinSettings from './JoplinSettings';
import Logger from 'lib/Logger';
/**
 * This is the main entry point to the Joplin API. You can access various services using the provided accessors.
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
    constructor(logger: Logger, implementation: any, plugin: Plugin, store: any);
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
