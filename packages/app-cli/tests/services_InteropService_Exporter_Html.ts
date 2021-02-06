import InteropService from '@joplin/lib/services/interop/InteropService';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { setupDatabaseAndSynchronizer, switchClient, exportDir } from './test-utils';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import * as fs from 'fs-extra';
import { tempFilePath } from './test-utils';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';

async function recreateExportDir() {
	const dir = exportDir();
	await fs.remove(dir);
	await fs.mkdirp(dir);
}

describe('services_InteropService_Exporter_Html', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await recreateExportDir();
		done();
	});

	test('should export HTML file', (async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ body: '**ma note**', parent_id: folder1.id });
		const filePath = `${exportDir()}/test.html`;

		await service.export({
			path: filePath,
			format: 'html',
		});

		const content = await fs.readFile(filePath, 'utf8');
		expect(content).toContain('<strong>ma note</strong>');
	}));

	test('should export plugin assets', (async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ body: '**ma note**', parent_id: folder1.id });
		const filePath = `${exportDir()}/test.html`;

		const contentScriptPath = tempFilePath('js');

		await fs.writeFile(contentScriptPath, `module.exports = {
			default: function(_context) { 
				return {
					plugin: function (markdownIt, _options) {
						
					}, 
					assets: function() {
						return [
							{ name: 'fence.css' }
						];
					},		
				}
			},
		}`);

		const assetPath = `${require('path').dirname(contentScriptPath)}/fence.css`;
		const fenceContent = 'strong { color: red; }';
		await fs.writeFile(assetPath, fenceContent);

		const plugins: PluginStates = {
			'test': {
				id: 'test',
				contentScripts: {
					[ContentScriptType.MarkdownItPlugin]: [
						{
							id: 'mdContentScript',
							path: contentScriptPath,
						},
					],
				},
				views: {},
			},
		};

		await service.export({
			path: filePath,
			format: 'html',
			plugins,
		});


		const fenceRelativePath = 'pluginAssets/mdContentScript/fence.css';

		const content = await fs.readFile(filePath, 'utf8');
		expect(content).toContain(fenceRelativePath);

		const readFenceContent = await fs.readFile(`${exportDir()}/${fenceRelativePath}`, 'utf8');
		expect(readFenceContent).toBe(fenceContent);
	}));

});
