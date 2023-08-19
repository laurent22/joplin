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
		'item.index',
		'item.selected',
		'item.size.height',
		'note.id',
		'note.is_shared',
		'note.is_todo',
		'note.isWatched',
		'note.titleHtml',
		'note.todo_completed',
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
				text-decoration: line-through;
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

	itemTemplate: // html
		`
		<div class="content -default {{#item.selected}}-selected{{/item.selected}} {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
			{{#note.is_todo}}
				<div class="checkbox">
					<input id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				</div>
			{{/note.is_todo}}	
			<div class="title" draggable="true" data-id="{{note.id}}">
				<i class="watchedicon fa fa-share-square"></i>
				<span>{{{note.titleHtml}}}</span>
			</div>
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
