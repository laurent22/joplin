import Logger from '@joplin/utils/Logger';
import { RenderNoteView } from '../plugins/api/noteListType';
import renderViewProps from './renderViewProps';

describe('renderViewProps', () => {

	it('should render view props', async () => {
		const view: RenderNoteView = {
			note: {
				title: 'M&M\'s®',
				user_updated_time: (new Date(2024, 2, 20, 15, 30, 45, 500)).getTime(),
				todo_completed: (new Date(2024, 2, 21, 15, 30, 45, 500)).getTime(),
				isWatched: true,
				is_todo: 1,
				tags: [
					{ title: 'one' },
					{ title: 'two' },
				],
			},
		};

		await renderViewProps(view, [], {
			noteTitleHtml: 'M&amp;M&apos;s&reg;',
		});

		expect(view).toEqual({
			note: {
				title: 'M&amp;M&apos;s&reg;',
				user_updated_time: '20/03/2024 15:30',
				todo_completed: '21/03/2024 15:30',
				isWatched: true,
				is_todo: 1,
				tags: 'one, two',
			},
		});
	});

	it('should handle invalid view props', async () => {
		const view: RenderNoteView = {
			note: {
				user_updated_time: 'not a number',
				tags: 123,
			},
		};

		Logger.globalLogger.enabled = false;
		await renderViewProps(view, [], {
			noteTitleHtml: '',
		});
		Logger.globalLogger.enabled = true;

		expect(view).toEqual({
			note: {
				user_updated_time: 'Invalid date',
				tags: 123,
			},
		});
	});
});
