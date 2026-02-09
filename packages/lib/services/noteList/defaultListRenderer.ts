import { _ } from '../../locale';
import CommandService from '../CommandService';
import Setting from '../../models/Setting';
import { ItemFlow, ListRenderer, OnClickEvent } from '../plugins/api/noteListType';

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
		body: string;
	};
	item: {
		// index: number;
		size: {
			height: number;
		};
		selected: boolean;
	};
}

interface CheckboxStats {
	total: number;
	checked: number;
	percent: number;
	isComplete: boolean;
}

const countCheckboxes = (body: string): CheckboxStats | null => {
	if (!body) return null;

	// Match unchecked: - [ ] and checked: - [x] or - [X]
	const uncheckedMatches = body.match(/- \[ \]/g);
	const checkedMatches = body.match(/- \[[xX]\]/g);

	const unchecked = uncheckedMatches ? uncheckedMatches.length : 0;
	const checked = checkedMatches ? checkedMatches.length : 0;
	const total = unchecked + checked;

	if (total === 0) return null;

	return {
		total,
		checked,
		percent: Math.round((checked / total) * 100),
		isComplete: checked === total,
	};
};

const renderer: ListRenderer = {
	id: 'compact',

	label: async () => _('Compact'),

	flow: ItemFlow.TopToBottom,

	itemSize: {
		width: 0,
		height: 34,
	},

	dependencies: [
		// 'item.index',
		'item.selected',
		'item.size.height',
		'note.body',
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

			> .checkbox-pie {
				display: flex;
				align-items: center;
				padding-right: 12px;
				padding-left: 8px;

				> .pie {
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: conic-gradient(
						var(--joplin-color4) calc(var(--percent) * 1%),
						var(--joplin-background-color) calc(var(--percent) * 1%)
					);
					border: 1px solid var(--joplin-color-faded);
					box-sizing: border-box;
				}

				> .pie.-complete {
					background: var(--joplin-background-color);
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 10px;
					color: var(--joplin-color4);
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

	onHeaderClick: async (event: OnClickEvent) => {
		const field = event.elementId === 'title' ? 'title' : 'user_updated_time';
		void CommandService.instance().execute('toggleNotesSortOrderField', field);
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
			{{#checkboxStats}}
				<div class="checkbox-pie" title="{{checked}}/{{total}} completed">
					{{#isComplete}}
						<div class="pie -complete">✓</div>
					{{/isComplete}}
					{{^isComplete}}
						<div class="pie" style="--percent: {{percent}};"></div>
					{{/isComplete}}
				</div>
			{{/checkboxStats}}
		</div>
	`,

	onRenderNote: async (props: Props) => {
		const showChart = Setting.value('notes.showCheckboxCompletionChart');
		return {
			...props,
			checkboxStats: showChart ? countCheckboxes(props.note.body) : null,
		};
	},
};

export default renderer;
