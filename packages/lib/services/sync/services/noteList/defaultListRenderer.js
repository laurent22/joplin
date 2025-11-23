"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const locale_1 = require("../../locale");
const CommandService_1 = require("../CommandService");
const noteListType_1 = require("../plugins/api/noteListType");
const renderer = {
    id: 'compact',
    label: async () => (0, locale_1._)('Compact'),
    flow: noteListType_1.ItemFlow.TopToBottom,
    itemSize: {
        width: 0,
        height: 34,
    },
    dependencies: [
        // 'item.index',
        'item.selected',
        'item.size.height',
        'note.id',
        'note.is_shared',
        'note.is_todo',
        'note.isWatched',
        'note.title',
        'note.todo_completed',
        'note.todoStatusText',
    ],
    itemCss: // css
    `	
		&:before {
			content: '';
			border-bottom: 1px solid var(--joplin-divider-color);
			width: 90%;
			position: absolute;
			bottom: 0;
			left: 5%;
		}
	
		> .content.-selected {
			background-color: var(--joplin-selected-color);
		}

		&:hover, &.-focus-visible > .content {
			background-color: var(--joplin-background-color-hover3);
		}
	
		> .content {
			display: flex;
			box-sizing: border-box;
			position: relative;
			width: 100%;
			padding-left: 16px;
	
			> .checkbox {
				display: flex;
				align-items: center;

				> input {
					margin: 0px 10px 1px 0px;
				}
			}
	
			> .title {
				font-family: var(--joplin-font-family);
				font-size: var(--joplin-font-size);
				text-decoration: none;
				color: var(--joplin-color);
				cursor: default;
				white-space: nowrap;
				flex: 1 1 0%;
				display: flex;
				align-items: center;
				overflow: hidden;

				> .watchedicon {
					display: none;
					padding-right: 4px;
					color: var(--joplin-color);
				}
			}
		}

		> .content.-shared {
			> .title {
				color: var(--joplin-color-warn3);
			}
		}

		> .content.-completed {
			> .title {
				opacity: 0.5;
			}
		}

		> .content.-watched {
			> .title {
				> .watchedicon {
					display: inline;
				}
			}
		}
	`,
    headerTemplate: // html
    `
		<button data-id="title">Title</button><button data-id="updated">Updated</button>
	`,
    onHeaderClick: async (event) => {
        const field = event.elementId === 'title' ? 'title' : 'user_updated_time';
        void CommandService_1.default.instance().execute('toggleNotesSortOrderField', field);
    },
    itemTemplate: // html
    `
		<div class="content {{#item.selected}}-selected{{/item.selected}} {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
			{{#note.is_todo}}
				<div class="checkbox">
					<input
						data-id="todo-checkbox"
						type="checkbox"
						aria-label="{{note.todoStatusText}}"
						tabindex="-1"
						{{#note.todo_completed}}checked="checked"{{/note.todo_completed}}
					>
				</div>
			{{/note.is_todo}}
			<div class="title" data-id="{{note.id}}">
				<i class="watchedicon fa fa-share-square"></i>
				<span>{{note.title}}</span>
			</div>
		</div>
	`,
    onRenderNote: async (props) => {
        return props;
    },
};
exports.default = renderer;
