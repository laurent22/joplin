/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';

export interface Implementation {
	injectCustomStyles(elementId: string, cssFilePath: string): Promise<void>;
	loadNoteCssFile(filePath: string): Promise<void>;
}

export default class JoplinWindow {

	private plugin_: Plugin;
	private implementation_: Implementation;

	public constructor(implementation: Implementation, plugin: Plugin, _store: any) {
		this.implementation_ = implementation;
		this.plugin_ = plugin;
	}

	/**
	 * Loads a chrome CSS file. It will apply to the window UI elements, except
	 * for the note viewer. It is the same as the "Custom stylesheet for
	 * Joplin-wide app styles" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
	 * for an example.
	 */
	public async loadChromeCssFile(filePath: string) {
		await this.implementation_.injectCustomStyles(`pluginStyles_${this.plugin_.id}`, filePath);
	}

	/**
	 * Loads a note CSS file. It will apply to the note viewer, as well as any
	 * exported or printed note. It is the same as the "Custom stylesheet for
	 * rendered Markdown" setting. See the [Load CSS Demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/load_css)
	 * for an example.
	 */
	public async loadNoteCssFile(filePath: string) {
		await this.implementation_.loadNoteCssFile(filePath);
	}

}
