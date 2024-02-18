import { _ } from '../../locale';
import CommandService from '../CommandService';
import { ItemFlow, ListRenderer, OnClickEvent } from '../plugins/api/noteListType';

const renderer: ListRenderer = {
	id: 'detailed',

	label: async () => _('Detailed'),

	flow: ItemFlow.TopToBottom,

	dependencies: [
		'note.todo_completed',
	],

	multiColumns: true,

	itemSize: {
		width: 0,
		height: 34,
	},

	itemCss: // css
		`	
		> .item {
			display: flex;
			align-items: center;
			box-sizing: border-box;
			padding-left: 8px;

			> .content {
				text-overflow: ellipsis;
				overflow: hidden;
			}
		}
	`,

	onHeaderClick: async (event: OnClickEvent) => {
		const field = event.elementId === 'title' ? 'title' : 'user_updated_time';
		void CommandService.instance().execute('toggleNotesSortOrderField', field);
	},

	itemTemplate: // html
		`<div class="content {{#item.selected}}-selected{{/item.selected}} {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
			{{value}}
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
