import joplin from 'api';
import { FileSystemItem } from 'api/types';

const fs = require('fs-extra');
const path = require('path');

function destDir(context:any) {
	return context.destPath;
}

function resourceDir(context:any) {
	return context.destPath + '/resources';
}

joplin.plugins.register({
	onStart: async function() {

		await joplin.interop.registerExportModule({
			description: 'JSON Export Directory',
			format: 'json',
			target: FileSystemItem.Directory,
			isNoteArchive: false,
			
			onInit: async (context:any) => {
				await fs.mkdirp(destDir(context));
				await fs.mkdirp(resourceDir(context));
			},

			onProcessItem: async (context:any, _itemType:number, item:any) => {
				const filePath = destDir(context) + '/' + item.id + '.json';
				const serialized = JSON.stringify(item);
				await fs.writeFile(filePath, serialized, 'utf8');
			},

			onProcessResource: async (context:any, _resource:any, filePath:string) => {
				const destPath = resourceDir(context) + '/' + path.basename(filePath);
				await fs.copy(filePath, destPath);
			},

			onClose: async (_context:any) => {},
		});

		await joplin.interop.registerImportModule({
			description: 'JSON Export Directory',
			format: 'json',
			sources: [FileSystemItem.Directory],
			isNoteArchive: false,
	
			onExec: async (context:any) => {
				// In this case importing is a lot more complicated due to the need to avoid
				// duplicate IDs, to validate data and ensure note links and 
				// resources are still working properly.
				// See InteropService_Importer_Raw for an example.
				console.info('Not implemented! Importing from:', context);
			},
		});
	},
});
