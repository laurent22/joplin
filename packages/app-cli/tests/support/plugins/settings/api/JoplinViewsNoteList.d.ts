import { Store } from 'redux';
import Plugin from '../Plugin';
import { ListRenderer } from './noteListType';
export default class JoplinViewsNoteList {
    private plugin_;
    private store_;
    constructor(plugin: Plugin, store: Store);
    registerRenderer(renderer: ListRenderer): Promise<void>;
}
