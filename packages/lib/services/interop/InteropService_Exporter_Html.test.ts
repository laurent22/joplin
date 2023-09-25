import InteropService from '../../services/interop/InteropService';
import { PluginStates } from '../../services/plugins/reducer';
import { setupDatabaseAndSynchronizer, switchClient, exportDir } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import * as fs from 'fs-extra';
import { tempFilePath } from '../../testing/test-utils';
import { ContentScriptType } from '../../services/plugins/api/types';
import { FileSystemItem } from './types';
import { readFile } from 'fs/promises';

async function recreateExportDir() {
	const dir = exportDir();
	await fs.remove(dir);
	await fs.mkdirp(dir);
}

describe('interop/InteropService_Exporter_Html', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await recreateExportDir();
	});

	test('should export HTML file', (async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ body: '**ma note**', parent_id: folder1.id });
		const filePath = `${exportDir()}/test.html`;

		await service.export({
			path: filePath,
			format: 'html',
			packIntoSingleFile: false,
		});

		const content = await fs.readFile(filePath, 'utf8');
		expect(content).toContain('<strong>ma note</strong>');
	}));

	test('should export HTML directory', (async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		await Folder.save({ title: 'folder2' });
		await Note.save({ title: 'note1', parent_id: folder1.id });
		await Note.save({ title: 'note2', parent_id: folder1.id });

		const dir = exportDir();
		await service.export({
			path: dir,
			format: 'html',
			target: FileSystemItem.Directory,
		});

		const rootDirs = await fs.readdir(dir);
		rootDirs.sort();
		expect(rootDirs).toEqual(['folder1', 'folder2']);

		const files = await fs.readdir(`${dir}/${rootDirs[0]}`);
		expect(files).toContain('note1.html');
		expect(files).toContain('note2.html');
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
			packIntoSingleFile: false,
			plugins,
		});


		const fenceRelativePath = 'pluginAssets/mdContentScript/fence.css';

		const content = await fs.readFile(filePath, 'utf8');
		expect(content).toContain(fenceRelativePath);

		const readFenceContent = await fs.readFile(`${exportDir()}/${fenceRelativePath}`, 'utf8');
		expect(readFenceContent).toBe(fenceContent);
	}));

	test('should not throw an error on invalid resource paths', (async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'note1', parent_id: folder1.id, body: '[a link starts with slash](/)' });

		const filePath = `${exportDir()}/test.html`;

		await service.export({
			path: filePath,
			format: 'html',
			packIntoSingleFile: true,
			target: FileSystemItem.File,
		});

		const content = await readFile(filePath, 'utf-8');
		expect(content).toContain('<a data-from-md="" title="/" href="" download="">a link starts with slash</a>');
	}));

});
