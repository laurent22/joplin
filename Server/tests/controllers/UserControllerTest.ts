const { asyncTest, clearDatabase } = require('../testUtils');

import UserController from '../../app/controllers/UserController';
import SessionController from '../../app/controllers/SessionController';
import { Session, File, Permission, ItemType } from '../../app/db';
import FileModel from '../../app/models/FileModel';
import PermissionModel from '../../app/models/PermissionModel';

describe('UserController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a new user along with his root file', asyncTest(async function() {
		const controller = new UserController();
		const sessionController = new SessionController();
		const session:Session = await sessionController.authenticate('admin@localhost', 'admin');
		const newUser = await controller.createUser(session.id, 'test@example.com', '123456');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(!!newUser.password).toBe(true);

		const rootFile:File = await FileModel.userRootFile(newUser.id);

		expect(!!rootFile).toBe(true);
		expect(!!rootFile.id).toBe(true);

		const permissions:Array<Permission> = await PermissionModel.filePermissions(rootFile.id);

		expect(permissions.length).toBe(1);
		expect(permissions[0].user_id).toBe(newUser.id);
		expect(permissions[0].item_type).toBe(ItemType.File);
		expect(permissions[0].item_id).toBe(rootFile.id);
		expect(permissions[0].is_owner).toBe(1);
		expect(permissions[0].can_read).toBe(1);
		expect(permissions[0].can_write).toBe(1);
	}));

});
