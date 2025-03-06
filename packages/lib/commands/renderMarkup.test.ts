import shim from '../shim';
import Resource from '../models/Resource';
import Note from '../models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../testing/test-utils';
import { runtime } from './renderMarkup';
import { MarkupLanguage } from '@joplin/renderer';
const testImagePath = `${supportDir}/photo.jpg`;

const command = runtime();

describe('renderMarkup', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should return the rendered note as HTML', async () => {
		{
			const renderedNote = await command.execute(null, MarkupLanguage.Markdown, 'hello **strong**');
			expect(renderedNote.html).toBe('<div id="rendered-md"><p>hello <strong>strong</strong></p>\n</div>');
			expect(!!renderedNote.pluginAssets).toBe(true);
			expect(!!renderedNote.cssStrings).toBe(true);
		}

		{
			const renderedNote = await await command.execute(null, MarkupLanguage.Markdown, '- [ ] Beer\n- [x] Milk\n- [ ] Eggs');
			expect(renderedNote.html).toContain('checkbox-label-unchecked">Beer');
			expect(renderedNote.html).toContain('checkbox-label-checked">Milk');
			expect(renderedNote.html).toContain('checkbox-label-unchecked">Eggs');
			expect(!!renderedNote.pluginAssets).toBe(true);
			expect(!!renderedNote.cssStrings).toBe(true);
		}

		{
			const note = await Note.save({ });
			await shim.attachFileToNote(note, testImagePath, { resizeLargeImages: 'never' });
			const resource = (await Resource.all())[0];
			const noteBody = (await Note.load(note.id)).body;
			const renderedNote = await await command.execute(null, MarkupLanguage.Markdown, noteBody);
			expect(renderedNote.html).toContain(`<div id="rendered-md"><p><img data-from-md data-resource-id="${resource.id}" src="`);
			expect(renderedNote.html).toContain(`/resources-1/${resource.id}.jpg?t=`);
			expect(renderedNote.html).toContain('" title alt="photo.jpg" /></p>');
		}
	});

});
