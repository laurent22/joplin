/* eslint-disable multiline-comment-style */

import shim from '../../../shim';
import Plugin from '../Plugin';

export default class JoplinWindow {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(_plugin: Plugin, store: any) {
		this.store_ = store;
	}

	/**
	 * Loads a chrome CSS file. It will apply to the window UI elements, except
	 * for the note viewer. It is the same as the "Custom stylesheet for
	 * Joplin-wide app styles" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
	 * for an example.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	public async loadChromeCssFile(filePath: string) {
		this.store_.dispatch({
			type: 'CUSTOM_CHROME_CSS_ADD',
			filePath,
		});
	}

	/**
	 * Loads a note CSS file. It will apply to the note viewer, as well as any
	 * exported or printed note. It is the same as the "Custom stylesheet for
	 * rendered Markdown" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
	 * for an example.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	public async loadNoteCssFile(filePath: string) {
		const cssString = await shim.fsDriver().readFile(filePath, 'utf8');

		this.store_.dispatch({
			type: 'CUSTOM_VIEWER_CSS_APPEND',
			css: cssString,
		});
	}

}
