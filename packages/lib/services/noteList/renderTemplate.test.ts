import { NoteListColumns } from '../plugins/api/noteListType';
import renderTemplate from './renderTemplate';

describe('renderTemplate', () => {

	it('should render a template', () => {
		const columns: NoteListColumns = [
			{
				name: 'note.is_todo',
				width: 40,
			},
			{
				name: 'note.user_updated_time:display',
				width: 100,
			},
			{
				name: 'note.titleHtml',
				width: 0,
			},
		];

		const template = // html
		`
			<div>
				{{#cells}}
					<div data-name="{{name}}" class="item" style="{{{styleHtml}}}">
						{{{contentHtml}}}
					</div>
				{{/cells}}
			</div>
		`;

		const valueTemplates = {
			'note.is_todo': // html
				`
				<span>
					{{#note.is_todo}}
						{{#note.todo_completed}}[x]{{/note.todo_completed}}{{^note.todo_completed}}[ ]{{/note.todo_completed}}						
					{{/note.is_todo}}
					{{^note.is_todo}}
						(-)
					{{/note.is_todo}}
				</span>
			`,
		};

		const view = {
			'note': {
				'user_updated_time:display': '18/02/24 14:30',
				'titleHtml': '<b>Hello</b>',
				'is_todo': 0,
				'todo_completed': 10000,
			},
		};

		{
			const actual = renderTemplate(columns, template, valueTemplates, view);
			expect(actual).toContain('18/02/24 14:30');
			expect(actual).toContain('<b>Hello</b>');

			const widthInfo = actual.match(/(width: (\d+)px|flex: 1)/g);
			expect(widthInfo).toEqual(['width: 40px', 'width: 100px', 'flex: 1']);

			const dataNames = actual.match(/data-name="(.*?)"/g);
			expect(dataNames).toEqual([
				'data-name="note.is_todo"',
				'data-name="note.user_updated_time:display"',
				'data-name="note.titleHtml"',
			]);

			expect(actual).toContain('(-)');
		}

		{
			const actual = renderTemplate(columns, template, valueTemplates, { note: { ...view.note, is_todo: 1 } });
			expect(actual).toContain('[x]');
		}

		{
			const actual = renderTemplate(columns, template, valueTemplates, { note: { ...view.note, is_todo: 1, todo_completed: 0 } });
			expect(actual).toContain('[ ]');
		}
	});

});
