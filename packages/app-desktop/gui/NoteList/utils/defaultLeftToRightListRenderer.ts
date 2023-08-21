import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import { ItemFlow, ListRenderer } from './types';

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
		body: string;
	};
	item: {
		size: {
			width: number;
			height: number;
		};
		selected: boolean;
	};
}

const defaultLeftToRightItemRenderer: ListRenderer = {
	flow: ItemFlow.LeftToRight,

	itemSize: {
		width: 150,
		height: 150,
	},

	dependencies: [
		'item.selected',
		'item.size.width',
		'item.size.height',
		'note.body',
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
	
		> .content {
			display: flex;
			box-sizing: border-box;
			position: relative;
			width: 100%;
			padding: 16px;
			align-items: flex-start;
			overflow-y: hidden;
			flex-direction: column;
			user-select: none;
	
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
				color: var(--joplin-color);
				cursor: default;
				flex: 0;
				display: flex;
				align-items: flex-start;
				margin-bottom: 8px;

				> .checkbox {
					margin: 0 6px 0 0;
				}

				> .watchedicon {
					display: none;
					padding-right: 4px;
					color: var(--joplin-color);
				}

				> .titlecontent {
					word-break: break-all;
					overflow: hidden;
					text-overflow: ellipsis;
					text-wrap: nowrap;
				}
			}

			> .preview {
				overflow-y: hidden;
				font-family: var(--joplin-font-family);
				font-size: var(--joplin-font-size);
				color: var(--joplin-color);
				cursor: default;
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
		<div class="content {{#item.selected}}-selected{{/item.selected}} {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
			<div style="width: {{titleWidth}}px;" class="title" data-id="{{note.id}}">
				{{#note.is_todo}}
					<input class="checkbox" data-id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				{{/note.is_todo}}
				<i class="watchedicon fa fa-share-square"></i>
				<div class="titlecontent">{{{note.titleHtml}}}</div>
			</div>
			<div class="preview">{{notePreview}}</div>
		</div>
	`,

	onRenderNote: async (props: Props) => {
		const markupToHtml_ = new MarkupToHtml();

		return {
			...props,
			notePreview: markupToHtml_.stripMarkup(MarkupLanguage.Markdown, props.note.body).substring(0, 200),
			titleWidth: props.item.size.width - 32,
		};
	},
};

export default defaultLeftToRightItemRenderer;
