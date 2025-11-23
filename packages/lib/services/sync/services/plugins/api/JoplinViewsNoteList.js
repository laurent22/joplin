"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const renderers_1 = require("../../noteList/renderers");
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
 * <img width="250px" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/note_list/TopToBottom.png"/>
 *
 * ### Left to right with thumbnails
 *
 * <img width="250px" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/note_list/LeftToRight_Thumbnails.png"/>
 *
 * ### Top to bottom with editable title
 *
 * <img width="250px" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/note_list/TopToBottom_Editable.png"/>
 *
 * <span class="platform-desktop">desktop</span>
 */
class JoplinViewsNoteList {
    constructor(plugin, store) {
        this.plugin_ = plugin;
        this.store_ = store;
    }
    async registerRenderer(renderer) {
        await (0, renderers_1.registerRenderer)(this.store_, Object.assign(Object.assign({}, renderer), { id: `${this.plugin_.id}:${renderer.id}` }));
    }
}
exports.default = JoplinViewsNoteList;
