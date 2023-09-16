/* eslint-disable multiline-comment-style */

import { Store } from 'redux';
import { registerRenderer } from '../../noteList/renderers';
import Plugin from '../Plugin';
import { ListRenderer } from './noteListType';

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
			id: this.plugin_.id,
		});
	}

}
