const { asyncTest, clearDatabase } = require('../testUtils');

import FileController from '../../app/controllers/FileController';
import SessionController from '../../app/controllers/SessionController';
import { Session, User, File } from '../../app/db'
import UserModel from '../../app/models/UserModel'

describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should authenticate a user and give back a session', asyncTest(async function() {
		const controller = new FileController();
		const sessionController = new SessionController();
		const user:User = await UserModel.loadByName('admin');
		const session:Session = await sessionController.authenticate(user.name, user.password)

		const file:File = {
			name: 'testing.md',
			content: '# My test',
			mime_type: 'text/markdown',
		}

		const newFile = await controller.createFile(session, user, file);
	}));

});