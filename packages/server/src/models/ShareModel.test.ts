import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createFile2 } from '../utils/testing/testUtils';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { Share, ShareType } from '../db';
import { postApi } from '../utils/testing/apiUtils';

describe('ShareModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ShareModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should validate share objects', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const file = await fileModel.save({
			name: 'test',
			parent_id: await fileModel.userRootFileId(),
		});

		let error = null;

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).createShare(20 as ShareType, file.id));
		expect(error instanceof ErrorBadRequest).toBe(true);

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).createShare(ShareType.Link, 'doesntexist'));
		expect(error instanceof ErrorNotFound).toBe(true);
	});

	test('should get shares by file ID', async function() {
		const { session: session1 } = await createUserAndSession(1);
		await createUserAndSession(2);
		await createUserAndSession(3);
		const file = await createFile2(session1.id, 'root:/test.txt:', 'testing');

		const share1 = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.App,
			file_id: 'root:/test.txt:',
		});

		const share2 = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.App,
			file_id: 'root:/test.txt:',
		});

		const shares = await models().share().sharesByFileId(file.id);

		expect(shares.length).toBe(2);
		expect(shares.map(s => s.file_id).join(',')).toBe(`${file.id},${file.id}`);
		expect(shares.map(s => s.id).sort().join(',')).toBe([share1.id, share2.id].sort().join(','));
	});

});
