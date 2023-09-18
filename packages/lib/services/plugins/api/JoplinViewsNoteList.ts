/* eslint-disable multiline-comment-style */

import { Store } from 'redux';
import { registerRenderer } from '../../noteList/renderers';
import Plugin from '../Plugin';
import { ListRenderer } from './noteListType';

/**
 * This API allows you to customise how each note in the note list is rendered.
 * The renderer you implement follows a unidirectional data flow.
 *
 * The app provides the required dependencies whenever a note is updated - you
 * process these dependencies, and return some props, which are then passed to
 * your template and rendered. See [[[ListRenderer]]] for a detailed description
 * of each property of the renderer.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/note_list_renderer)
 *
 * The default list renderer is implemented using the same API, so it worth checking it too:
 *
 * [Default list renderer](https://github.com/laurent22/joplin/tree/dev/packages/lib/services/noteList/defaultListRenderer.ts)
 */
export default class JoplinViewsNoteList {

	private plugin_: Plugin;
	private store_: Store;

	public constructor(plugin: Plugin, store: Store) {
		this.plugin_ = plugin;
		this.store_ = store;
	}

	public async registerRenderer(renderer: ListRenderer) {
		await registerRenderer(this.store_, {
			...renderer,
			id: `${this.plugin_.id}:${renderer.id}`,
		});
	}

}
