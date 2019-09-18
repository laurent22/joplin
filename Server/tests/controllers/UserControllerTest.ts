const { asyncTest, clearDatabase } = require('../testUtils');

import UserController from '../../app/controllers/UserController';
import SessionController from '../../app/controllers/SessionController';
import { Session, File, Permission, ItemType } from '../../app/db';
import UserModel from '../../app/models/UserModel';
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
		const fileModel = new FileModel();
		const permissionModel = new PermissionModel();
		const userModel = new UserModel();

		await userModel.createUser('admin@localhost', 'admin', { is_admin: 1 });
		const session:Session = await sessionController.authenticate('admin@localhost', 'admin');
		const newUser = await controller.createUser(session.id, 'test@example.com', '123456');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(!!newUser.password).toBe(true);

		const rootFile:File = await fileModel.userRootFile(newUser.id);

		expect(!!rootFile).toBe(true);
		expect(!!rootFile.id).toBe(true);

		const permissions:Array<Permission> = await permissionModel.filePermissions(rootFile.id);

		expect(permissions.length).toBe(1);
		expect(permissions[0].user_id).toBe(newUser.id);
		expect(permissions[0].item_type).toBe(ItemType.File);
		expect(permissions[0].item_id).toBe(rootFile.id);
		expect(permissions[0].is_owner).toBe(1);
		expect(permissions[0].can_read).toBe(1);
		expect(permissions[0].can_write).toBe(1);
	}));

	it('should not create anything, neither user, root file nor permissions, if user creation fail', asyncTest(async function() {
		const controller = new UserController();
		const sessionController = new SessionController();
		const fileModel = new FileModel();
		const permissionModel = new PermissionModel();
		const userModel = new UserModel();

		await userModel.createUser('admin@localhost', 'admin', { is_admin: 1 });
		const session:Session = await sessionController.authenticate('admin@localhost', 'admin');
		await controller.createUser(session.id, 'test@example.com', '123456');

		const beforeFileCount = (await fileModel.all<File[]>()).length;
		const beforeUserCount = (await userModel.all<File[]>()).length;
		const beforePermissionCount = (await permissionModel.all<File[]>()).length;

		let hasThrown = false;
		try {
			await controller.createUser(session.id, 'test@example.com', '123456');
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);

		const afterFileCount = (await fileModel.all<File[]>()).length;
		const afterUserCount = (await userModel.all<File[]>()).length;
		const afterPermissionCount = (await permissionModel.all<File[]>()).length;

		expect(beforeFileCount).toBe(afterFileCount);
		expect(beforeUserCount).toBe(afterUserCount);
		expect(beforePermissionCount).toBe(afterPermissionCount);
	}));

});
