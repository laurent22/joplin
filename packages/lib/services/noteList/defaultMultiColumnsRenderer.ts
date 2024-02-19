import { _ } from '../../locale';
import CommandService from '../CommandService';
import { ItemFlow, ListRenderer, OnClickEvent } from '../plugins/api/noteListType';

const renderer: ListRenderer = {
	id: 'detailed',

	label: async () => _('Detailed'),

	flow: ItemFlow.TopToBottom,

	dependencies: [
		'note.todo_completed',
		'item.selected',
	],

	multiColumns: true,

	itemSize: {
		width: 0,
		height: 34,
	},

	itemCss: // css
		`	
		> .row {
			display: flex;
			height: 100%;

			> .item {
				display: flex;
				align-items: center;
				box-sizing: border-box;
				padding-left: 8px;
				overflow: hidden;
				opacity: 0.6;

				> .content {
					text-overflow: ellipsis;
					overflow: hidden;
					white-space: nowrap;
				}
			}

			> .item[data-name="note.is_todo"],
			> .item[data-name="note.titleHtml"] {
				opacity: 1;
			}
		}

		> .row.-selected {
			background-color: var(--joplin-selected-color);
		}
	`,

	onHeaderClick: async (event: OnClickEvent) => {
		const field = event.elementId === 'title' ? 'title' : 'user_updated_time';
		void CommandService.instance().execute('toggleNotesSortOrderField', field);
	},

	itemTemplate: // html
		`
			<div class="row {{#item.selected}}-selected{{/item.selected}}">
				{{#cells}}
					<div data-name="{{name}}" class="item" style="{{{styleHtml}}}">
						<div class="content {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
							{{{contentHtml}}}
						</div>
					</div>
				{{/cells}}
			</div>
		`,

	itemValueTemplates: {
		'note.is_todo': // html
			`
			{{#note.is_todo}}
				<div class="checkbox">
					<input data-id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				</div>
			{{/note.is_todo}}
		`,
	},

	onRenderNote: async (props: any) => {
		return {
			...props,
		};
	},
};

export default renderer;
