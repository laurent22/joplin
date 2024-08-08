import { Store } from 'redux';
import Plugin from '../Plugin';
import { ListRenderer } from './noteListType';
/**
 * This API allows you to customise how each note in the note list is rendered.
 * The renderer you implement follows a unidirectional data flow.
 *
 * The app provides the required dependencies whenever a note is updated - you
 * process these dependencies, and return some props, which are then passed to
 * your template and rendered. See [[ListRenderer]] for a detailed description
 * of each property of the renderer.
 *
 * ## Reference
 *
 * * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/note_list_renderer)
 *
 * * [Default simple renderer](https://github.com/laurent22/joplin/tree/dev/packages/lib/services/noteList/defaultListRenderer.ts)
 *
 * * [Default detailed renderer](https://github.com/laurent22/joplin/tree/dev/packages/lib/services/noteList/defaultMultiColumnsRenderer.ts)
 *
 * ## Screenshots:
 *
 * ### Top to bottom with title, date and body
 *
 * <img width="250px" src="https://global.discourse-cdn.com/standard14/uploads/cozic/optimized/3X/0/9/09a40a011a805bc39736716d23b08033af420222_2_670x750.png"/>
 *
 * ### Left to right with thumbnails
 *
 * <img width="250px" src="https://global.discourse-cdn.com/standard14/uploads/cozic/optimized/3X/d/f/dff6f14f9ca3ec6a772314719622723feaedcd09_2_588x750.png"/>
 *
 * ### Top to bottom with editable title
 *
 * <img width="250px" src="https://global.discourse-cdn.com/standard14/uploads/cozic/optimized/3X/7/2/72acb1bab67d32482cb3da7bb053e54d44ad87b8_2_580x500.png"/>
 *
 * <span class="platform-desktop">desktop</span>
 */
export default class JoplinViewsNoteList {
    private plugin_;
    private store_;
    constructor(plugin: Plugin, store: Store);
    registerRenderer(renderer: ListRenderer): Promise<void>;
}
