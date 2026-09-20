import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { ListRenderer, NoteListColumns } from '../plugins/api/noteListType';
import defaultLeftToRightListRenderer from './defaultLeftToRightListRenderer';
import defaultListRenderer from './defaultListRenderer';
import defaultMultiColumnsRenderer from './defaultMultiColumnsRenderer';
import renderTemplate from './renderTemplate';

const columns: NoteListColumns = [{ name: 'note.title', width: 0 }];

const renderNote = async (renderer: ListRenderer, isPublished: boolean, selected: boolean) => {
	const view = await renderer.onRenderNote({
		note: {
			id: '00000000000000000000000000000001',
			title: 'Test',
			body: '',
			is_published: isPublished,
			is_todo: 0,
			todo_completed: 0,
			is_locked: 0,
			is_conflict: 0,
			conflict_original_id: '',
			share_id: '',
			checkboxes: null,
		},
		item: { selected, size: { width: 200, height: 34 } },
	});
	return renderTemplate(columns, renderer.itemTemplate, renderer.itemValueTemplates ?? {}, view);
};

// The multi-column renderer always outputs the icon and reveals it through the -published row class.
const hasVisiblePublishedIcon = (html: string) => {
	return html.includes('publishedicon') && html.includes('-published');
};

describe('publishedIndicator', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test.each([
		{ name: 'compact', renderer: defaultListRenderer, isPublished: true, selected: true },
		{ name: 'compact', renderer: defaultListRenderer, isPublished: true, selected: false },
		{ name: 'compact', renderer: defaultListRenderer, isPublished: false, selected: true },
		{ name: 'detailed', renderer: defaultLeftToRightListRenderer, isPublished: true, selected: true },
		{ name: 'detailed', renderer: defaultLeftToRightListRenderer, isPublished: true, selected: false },
		{ name: 'detailed', renderer: defaultLeftToRightListRenderer, isPublished: false, selected: true },
		{ name: 'multi-columns', renderer: defaultMultiColumnsRenderer, isPublished: true, selected: true },
		{ name: 'multi-columns', renderer: defaultMultiColumnsRenderer, isPublished: true, selected: false },
		{ name: 'multi-columns', renderer: defaultMultiColumnsRenderer, isPublished: false, selected: true },
	])('$name renderer should show the published icon only on published notes (published: $isPublished, selected: $selected)', async ({ renderer, isPublished, selected }) => {
		const html = await renderNote(renderer, isPublished, selected);
		expect(hasVisiblePublishedIcon(html)).toBe(isPublished);
		if (isPublished) expect(html).toContain('aria-label="Published"');
	});

});
