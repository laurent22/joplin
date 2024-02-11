import { _ } from '../../locale';
import time from '../../time';
import CommandService from '../CommandService';
import { ItemFlow, ListRenderer, OnClickEvent } from '../plugins/api/noteListType';

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
		user_updated_time: number;
	};
	item: {
		// index: number;
		size: {
			height: number;
		};
		selected: boolean;
	};
}

const renderer: ListRenderer = {
	id: 'detailed',

	label: async () => _('Detailed'),

	flow: ItemFlow.TopToBottom,

	multiColumns: true,

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
		'note.titleHtml',
		'note.todo_completed',
		'note.user_updated_time',
	],

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
		'note.todo_completed': '{{#note.todo_completed}}[x]{{/note.todo_completed}}{{^note.todo_completed}}[ ]{{/note.todo_completed}}',
		'note.user_updated_time': '{{formattedUpdatedTime}}',
	},

	onRenderNote: async (props: Props) => {

		return {
			...props,
			formattedUpdatedTime: time.unixMsToLocalDateTime(props.note.user_updated_time),
		};
	},
};

export default renderer;
