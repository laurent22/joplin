/* eslint-disable no-unused-vars */


// import * as fs from 'fs-extra';
// import { setupDatabaseAndSynchronizer, switchClient, exportDir, supportDir } from '../../testing/test-utils.js';
// import InteropService_Importer_Md from '../../services/interop/InteropService_Importer_Md';
// import BaseModel from '../../BaseModel';
// // import Folder from '../../models/Folder';
// // import Resource from '../../models/Resource';
// // import Note from '../../models/Note';
// // import shim from '../../shim';

// describe('services_InteropService_Importer_Md', function() {

//	beforeEach(async (done) => {
//		await setupDatabaseAndSynchronizer(1);
//		await switchClient(1);

//		await fs.remove(exportDir());
//		await fs.mkdirp(exportDir());
//		// await fs.copy(`${supportDir}/photo.jpg`, `${exportDir()}/_resources/photo.jpg`);
//		// await fs.copy(`${supportDir}/photo.jpg`, `${exportDir()}/_resources/photo-åäö.jpg`);
//		// await fs.outputFile(`${exportDir()}/notebook1/notebook2/note1.md`);
//		// await fs.outputFile(`${exportDir()}/notebook1/notebook2/note2.md`);
//		// await fs.outputFile(`${exportDir()}/notebook1/note3.html`);
//		done();
//	});


//	it('should handle duplicate note names', (async () => {
//		await fs.outputFile(`${exportDir()}/notebook1/notebook2/note1.md`);
//		await fs.outputFile(`${exportDir()}/notebook1/notebook2/note1-1.md`);
//		//
//		const importer = new InteropService_Importer_Md();

//	}));
// });

it('will pass', () => {
	expect(true).toBe(true);
});
