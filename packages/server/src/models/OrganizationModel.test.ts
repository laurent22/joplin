import { OrganizationUserInvitationStatus } from '../services/database/types';
import { ErrorUnprocessableEntity } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUser, expectHttpError } from '../utils/testing/testUtils';
import { organizationInvitationConfirmUrl } from '../utils/urlUtils';
import { AccountType } from './UserModel';

const createOrg = async () => {
	const orgOwner = await createUser(1000);

	await models().user().save({
		id: orgOwner.id,
		account_type: AccountType.Pro,
	});

	await models().organizations().save({
		name: 'testorg',
		max_users: 10,
		owner_id: orgOwner.id,
	});

	return (await models().organizations().all())[0];
};

describe('OrganizationModel', function() {

	beforeAll(async () => {
		await beforeAllDb('OrganizationModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create an organization', async function() {
		const org = await createOrg();
		const owner = (await models().user().all())[0];

		expect(org.name).toBe('testorg');
		expect(org.max_users).toBe(10);
		expect(org.owner_id).toBe(owner.id);
	});

	test('owner should be a Pro account', async function() {
		const user = await createUser(1);

		await expectHttpError(async () => models().organizations().save({
			name: 'org',
			owner_id: user.id,
		}), ErrorUnprocessableEntity.httpCode);
	});

	test('should invite a user to the org', async function() {
		const org = await createOrg();
		await models().email().deleteAll();
		const orgUser = await models().organizations().inviteUser(org.id, 'test@example.com');

		expect(orgUser.organization_id).toBe(org.id);
		expect(orgUser.invitation_email).toBe('test@example.com');
		expect(orgUser.invitation_status).toBe(OrganizationUserInvitationStatus.Sent);
		expect(orgUser.is_admin).toBe(0);

		const email = (await models().email().all())[0];
		expect(email.subject).toContain('testorg');
		expect(email.recipient_email).toContain('test@example.com');
		expect(email.body).toContain(organizationInvitationConfirmUrl(orgUser.id));
	});

});
