const { asyncTest, clearDatabase } = require('../testUtils');

// import FileController from '../../app/controllers/FileController';
// import SessionController from '../../app/controllers/SessionController';
// import { Session, File } from '../../app/db';
// import FileModel from '../../app/models/FileModel';

describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a file', asyncTest(async function() {
		// const controller = new FileController();
		// const sessionController = new SessionController();

		// const session:Session = await sessionController.authenticate('admin@locahost', 'admin');
		// const rootFile:File = await FileModel.userRootFile(session.user_id);

		// const file:File = {
		// 	name: 'testing.md',
		// 	content: '# My test',
		// 	parent_id: rootFile.id,
		// 	mime_type: 'text/markdown',
		// };

		// const newFile = await controller.createFile(session.id, file);
		// console.info(newFile);
		// expect(!!newFile).toBe(true);
	}));

});
