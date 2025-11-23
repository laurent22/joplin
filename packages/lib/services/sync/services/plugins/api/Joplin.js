"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const JoplinData_1 = require("./JoplinData");
const JoplinPlugins_1 = require("./JoplinPlugins");
const JoplinWorkspace_1 = require("./JoplinWorkspace");
const JoplinFilters_1 = require("./JoplinFilters");
const JoplinCommands_1 = require("./JoplinCommands");
const JoplinViews_1 = require("./JoplinViews");
const JoplinInterop_1 = require("./JoplinInterop");
const JoplinSettings_1 = require("./JoplinSettings");
const JoplinContentScripts_1 = require("./JoplinContentScripts");
const JoplinClipboard_1 = require("./JoplinClipboard");
const JoplinWindow_1 = require("./JoplinWindow");
const JoplinImaging_1 = require("./JoplinImaging");
const theme_1 = require("../../../theme");
const Setting_1 = require("../../../models/Setting");
const type_1 = require("../../../themes/type");
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
class Joplin {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(implementation, plugin, store) {
        this.data_ = null;
        this.plugins_ = null;
        this.imaging_ = null;
        this.workspace_ = null;
        this.filters_ = null;
        this.commands_ = null;
        this.views_ = null;
        this.interop_ = null;
        this.settings_ = null;
        this.contentScripts_ = null;
        this.clipboard_ = null;
        this.window_ = null;
        this.implementation_ = null;
        this.implementation_ = implementation;
        this.data_ = new JoplinData_1.default(plugin);
        this.plugins_ = new JoplinPlugins_1.default(plugin);
        this.imaging_ = new JoplinImaging_1.default(implementation.imaging);
        this.workspace_ = new JoplinWorkspace_1.default(plugin, store);
        this.filters_ = new JoplinFilters_1.default();
        this.commands_ = new JoplinCommands_1.default(plugin);
        this.views_ = new JoplinViews_1.default(implementation.joplin.views, plugin, store);
        this.interop_ = new JoplinInterop_1.default();
        this.settings_ = new JoplinSettings_1.default(plugin);
        this.contentScripts_ = new JoplinContentScripts_1.default(plugin);
        this.clipboard_ = new JoplinClipboard_1.default(implementation.clipboard, implementation.nativeImage);
        this.window_ = new JoplinWindow_1.default(plugin, store);
    }
    get data() {
        return this.data_;
    }
    get clipboard() {
        return this.clipboard_;
    }
    get imaging() {
        return this.imaging_;
    }
    get window() {
        return this.window_;
    }
    get plugins() {
        return this.plugins_;
    }
    get workspace() {
        return this.workspace_;
    }
    get contentScripts() {
        return this.contentScripts_;
    }
    /**
     * @ignore
     *
     * Not sure if it's the best way to hook into the app
     * so for now disable filters.
     */
    get filters() {
        return this.filters_;
    }
    get commands() {
        return this.commands_;
    }
    get views() {
        return this.views_;
    }
    get interop() {
        return this.interop_;
    }
    get settings() {
        return this.settings_;
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
     *
     * <span class="platform-desktop">desktop</span>
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    require(_path) {
        // Just a stub. Implementation has to be done within plugin process, in plugin_index.js
    }
    async versionInfo() {
        return this.implementation_.versionInfo;
    }
    /**
     * Tells whether the current theme is a dark one or not.
     */
    async shouldUseDarkColors() {
        const theme = (0, theme_1.themeStyle)(Setting_1.default.value('theme'));
        return theme.appearance === type_1.ThemeAppearance.Dark;
    }
}
exports.default = Joplin;
