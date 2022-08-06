import { TestApp } from '@joplin/lib/testing/test-utils.js';
// import uuid from '@joplin/lib/uuid';
// import Folder from '@joplin/lib/models/Folder';
// import execCommand2 from '@joplin/tools/tool-utils';

describe('CreateSubNotebook', function() {
	let testApp: any;

	beforeEach(async (done) => {
		testApp = new TestApp();
		await testApp.start(['--no-welcome']);
		done();
	});

	afterEach(async (done) => {
		if (testApp) await testApp.destroy();
		testApp = null;
		done();
	});

	it('Create notebook', (async () => {
		// const folders = await createNTestFolders(1);
		// await testApp.wait();
		// const notes0 = await createNTestNotes(0, folders[0]);
		// const notes1 = await createNTestNotes(1, folders[1]);
		// console.log(notes0);
		// console.log(notes1);
		// await testApp.wait();
	}));

	it('Create sub-notebook', (async () => {}));

	it('Create sub-notebook in target notebook', (async () => {}));

	it('Create sub-notebook in target ambiguous notebook', (async () => {}));

});
