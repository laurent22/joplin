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
				name: 'note.user_updated_time',
				width: 100,
			},
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				name: 'note.titleHtml' as any, // Testing backward compatibility
				width: 200,
			},
			{
				name: 'note.title',
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
				'user_updated_time': '18/02/24 14:30',
				'titleHtml': '<b>Hello</b>',
				'title': '<b>Hello2</b>',
				'is_todo': 0,
				'todo_completed': 10000,
			},
		};

		{
			const actual = renderTemplate(columns, template, valueTemplates, view);
			expect(actual).toContain('18/02/24 14:30');
			expect(actual).toContain('<b>Hello</b>');
			expect(actual).toContain('<b>Hello2</b>');

			const widthInfo = actual.match(/(width: (\d+)px|flex: 1)/g);
			expect(widthInfo).toEqual(['width: 40px', 'width: 100px', 'width: 200px', 'flex: 1']);

			const dataNames = actual.match(/data-name="(.*?)"/g);
			expect(dataNames).toEqual([
				'data-name="note.is_todo"',
				'data-name="note.user_updated_time"',
				'data-name="note.titleHtml"',
				'data-name="note.title"',
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
