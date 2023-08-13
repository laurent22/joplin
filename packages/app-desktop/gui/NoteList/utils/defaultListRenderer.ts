import Api, { RequestMethod } from '@joplin/lib/services/rest/Api';
import { Context } from 'vm';
import { ItemFlow, ListRenderer, OnChangeEvent } from './types';

const api = new Api();

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
	};
	item: {
		size: {
			height: number;
		};
		selected: boolean;
	};
}

const defaultItemRenderer: ListRenderer = {
	flow: ItemFlow.TopToBottom,

	itemSize: {
		width: 0,
		height: 34,
	},

	dependencies: [
		'note.id',
		'note.title',
		'note.is_todo',
		'note.todo_completed',
		'item.size.height',
		'item.selected',
		'item.index',
	],

	itemCss: `			
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

		&:hover {
			background-color: var(--joplin-background-color-hover3);
		}
	
		> .content.-default {
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
			}
		}
	`,

	itemTemplate: `
		<div class="content -default {{#item.selected}}-selected{{/item.selected}}">
			{{#note.is_todo}}
				<div class="checkbox">
					<input id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				</div>
			{{/note.is_todo}}	
			<a href="#" class="title" draggable="true" data-id="{{note.id}}">
				<span>{{item.index}} {{note.title}}</span>
			</a>
		</div>
	`,

	onChange: async (context: Context, elementId: string, event: OnChangeEvent) => {
		if (elementId === 'todo-checkbox') {
			await api.route(RequestMethod.PUT, `notes/${context.noteId}`, null, JSON.stringify({
				todo_completed: event.value ? Date.now() : 0,
			}));
		} else {
			throw new Error(`Unknown element ID: ${elementId}`);
		}
	},

	onRenderNote: async (props: Props) => {
		return props;
	},
};

export default defaultItemRenderer;
