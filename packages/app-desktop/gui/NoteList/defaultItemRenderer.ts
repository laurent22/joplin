import { ItemFlow, ItemRenderer } from './types';

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

const defaultItemRenderer: ItemRenderer = {
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
	],

	itemTemplate: `
		<div class="content -default {{#item.selected}}-selected{{/item.selected}}">
			<div class="checkbox" style="height: {{item.size.height}}px;">
				<input type="checkbox" style="margin: 0px 5px 1px 0px;">
			</div>
			<a href="#" class="title" draggable="true" data-id="{{note.id}}">
				<span>{{note.title}}</span
			</a>
		</div>
	`,

	onRenderNote: async (props: Props) => {
		return props;
	},
};

export default defaultItemRenderer;
