"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("api");
const noteListType_1 = require("api/noteListType");
const thumbnailCache_ = {};
// This renderer displays the notes top to bottom. It's a minimal example that
// only displays the note title. For a full renderer, it's recommended to also
// handle whether the notes is a regular note or to-do (in which case a checkbox
// should be displayed).
const registerSimpleTopToBottomRenderer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield api_1.default.views.noteList.registerRenderer({
        id: 'simpleTopToBottom',
        label: () => __awaiter(void 0, void 0, void 0, function* () { return 'Simple top-to-bottom renderer'; }),
        flow: noteListType_1.ItemFlow.TopToBottom,
        itemSize: {
            width: 0,
            height: 34,
        },
        dependencies: [
            'item.selected',
            'note.titleHtml',
        ],
        itemCss: // css
        `
			> .content {
				display: flex;
				align-items: center;
				width: 100%;
				box-sizing: border-box;
				padding-left: 10px;
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
        itemTemplate: // html
        `
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				{{{note.titleHtml}}}
			</div>
		`,
        onRenderNote: (props) => __awaiter(void 0, void 0, void 0, function* () {
            return props;
        }),
    });
});
// This renderer displays the notes from left to right - it takes the first
// resource in the note, if any, and displays it as a thumbnail for the note. If
// no thumbnail is available, it displays the note title.
const registerSimpleLeftToRightRenderer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield api_1.default.views.noteList.registerRenderer({
        id: 'simpleLeftToRight',
        label: () => __awaiter(void 0, void 0, void 0, function* () { return 'Simple left-to-right renderer'; }),
        flow: noteListType_1.ItemFlow.LeftToRight,
        itemSize: {
            width: 100,
            height: 100,
        },
        dependencies: [
            'note.id',
            'item.selected',
            'note.titleHtml',
            'note.body',
        ],
        itemCss: // css
        `
			> .content {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 100%;
				box-sizing: border-box;
				padding: 10px;
				border: 1px solid var(--joplin-divider-color);

				> .thumbnail {
					display: flex;
					max-width: 80px;
					max-height: 80px;
				}
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
        itemTemplate: // html
        `
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				{{#thumbnailFilePath}}
					<img class="thumbnail" src="file://{{thumbnailFilePath}}"/>
				{{/thumbnailFilePath}}
				{{^thumbnailFilePath}}
					{{{note.titleHtml}}}
				{{/thumbnailFilePath}}
			</div>
		`,
        onRenderNote: (props) => __awaiter(void 0, void 0, void 0, function* () {
            const resources = yield api_1.default.data.get(['notes', props.note.id, 'resources']);
            const resource = resources.items.length ? resources.items[0] : null;
            let thumbnailFilePath = '';
            if (resource) {
                const existingFilePath = thumbnailCache_[resource.id];
                if (existingFilePath) {
                    thumbnailFilePath = existingFilePath;
                }
                else {
                    const imageHandle = yield api_1.default.imaging.createFromResource(resource.id);
                    const resizedImageHandle = yield api_1.default.imaging.resize(imageHandle, { width: 80 });
                    thumbnailFilePath = (yield api_1.default.plugins.dataDir()) + '/thumb_' + resource.id + '.jpg';
                    yield api_1.default.imaging.toJpgFile(resizedImageHandle, thumbnailFilePath, 70);
                    yield api_1.default.imaging.free(imageHandle);
                    yield api_1.default.imaging.free(resizedImageHandle);
                    thumbnailCache_[resource.id] = thumbnailFilePath;
                }
            }
            return Object.assign({ thumbnailFilePath }, props);
        }),
    });
});
// This renderer displays an editable text input to change the note title
// directly from the note list.
const registerBuildInEditorRenderer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield api_1.default.views.noteList.registerRenderer({
        id: 'buildInEditor',
        label: () => __awaiter(void 0, void 0, void 0, function* () { return 'Viewer with editor'; }),
        flow: noteListType_1.ItemFlow.TopToBottom,
        itemSize: {
            width: 0,
            height: 34,
        },
        dependencies: [
            'item.selected',
            'note.title',
        ],
        itemCss: // css
        `
			> .content {
				display: flex;
				align-items: center;
				width: 100%;
				box-sizing: border-box;
				padding-left: 10px;
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
        itemTemplate: // html
        `
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				<input data-id="noteTitleInput" type="text" value="{{note.title}}" />
			</div>
		`,
        onRenderNote: (props) => __awaiter(void 0, void 0, void 0, function* () {
            return props;
        }),
        onChange: (event) => __awaiter(void 0, void 0, void 0, function* () {
            if (event.elementId === 'noteTitleInput') {
                yield api_1.default.data.put(['notes', event.noteId], null, { title: event.value });
            }
        }),
    });
});
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield registerSimpleTopToBottomRenderer();
            yield registerSimpleLeftToRightRenderer();
            yield registerBuildInEditorRenderer();
        });
    },
});
//# sourceMappingURL=index.js.map