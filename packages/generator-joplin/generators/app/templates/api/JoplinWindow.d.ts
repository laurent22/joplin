import Plugin from '../Plugin';
type DispatchStore = {
    dispatch: (action: {
        type: string;
        [k: string]: unknown;
    }) => void;
};
export default class JoplinWindow {
    private store_;
    constructor(_plugin: Plugin, store: DispatchStore);
    /**
     * Loads a chrome CSS file. It will apply to the window UI elements, except
     * for the note viewer. It is the same as the "Custom stylesheet for
     * Joplin-wide app styles" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
     * for an example.
     *
     * <span class="platform-desktop">desktop</span>
     */
    loadChromeCssFile(filePath: string): Promise<void>;
    /**
     * Loads a note CSS file. It will apply to the note viewer, as well as any
     * exported or printed note. It is the same as the "Custom stylesheet for
     * rendered Markdown" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
     * for an example.
     *
     * <span class="platform-desktop">desktop</span>
     */
    loadNoteCssFile(filePath: string): Promise<void>;
}
export {};
