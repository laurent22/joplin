import { Organization, OrganizationUserInvitationStatus } from '../services/database/types';
import { ErrorBadRequest, ErrorUnprocessableEntity } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUser, expectHttpError } from '../utils/testing/testUtils';
import { organizationInvitationConfirmUrl } from '../utils/urlUtils';
import { AccountType } from './UserModel';

const createOrg = async (props: Organization = null) => {
	const orgOwner = await createUser(1000);

	await models().user().save({
		id: orgOwner.id,
		account_type: AccountType.Pro,
	});

	await models().organizations().save({
		name: 'testorg',
		max_users: 10,
		owner_id: orgOwner.id,
		...props,
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

	test('should create an organization', async () => {
		const org = await createOrg();
		const owner = (await models().user().all())[0];

		expect(org.name).toBe('testorg');
		expect(org.max_users).toBe(10);
		expect(org.owner_id).toBe(owner.id);
	});

	test('owner should be a Pro account', async () => {
		const user = await createUser(1);

		await expectHttpError(async () => models().organizations().save({
			name: 'org',
			owner_id: user.id,
		}), ErrorUnprocessableEntity.httpCode);
	});

	test('should invite a user to the org', async () => {
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

	test('should accept an invitation', async () => {
		const org = await createOrg();
		const orgUser = await models().organizations().inviteUser(org.id, 'test@example.com');
		await models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Accepted);

		const newUser = await models().user().loadByEmail('test@example.com');
		expect(newUser.account_type).toBe(AccountType.Pro);
		expect(newUser.email_confirmed).toBe(1);
		expect(newUser.must_set_password).toBe(1);

		const orgUserMod = await models().organizationUsers().load(orgUser.id);
		expect(orgUserMod.user_id).toBe(newUser.id);
		expect(orgUserMod.invitation_status).toBe(OrganizationUserInvitationStatus.Accepted);
	});

	test('should reject an invitation', async () => {
		const org = await createOrg();
		const orgUser = await models().organizations().inviteUser(org.id, 'test@example.com');
		const usersBefore = await models().user().count();
		await models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Rejected);
		const usersAfter = await models().user().count();

		expect(usersAfter).toBe(usersBefore);

		const orgUserMod = await models().organizationUsers().load(orgUser.id);
		expect(orgUserMod.user_id).toBeFalsy();
		expect(orgUserMod.invitation_status).toBe(OrganizationUserInvitationStatus.Rejected);
	});

	test('should check invitation status before responding', async () => {
		const org = await createOrg();
		const orgUser = await models().organizations().inviteUser(org.id, 'test@example.com');
		await expectHttpError(async () => models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.None), ErrorBadRequest.httpCode);
		await models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Accepted);
		await expectHttpError(async () => models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Accepted), ErrorBadRequest.httpCode);
		await expectHttpError(async () => models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Rejected), ErrorBadRequest.httpCode);
	});

	test('should not have a race condition when inviting users', async () => {
		const org = await createOrg({ max_users: 10 });

		const promises = [];
		for (let i = 0; i < 100; i++) {
			promises.push(models().organizations().inviteUser(org.id, `test${i}@example.com`));
		}

		try {
			await Promise.allSettled(promises);
		} catch (error) {
			// Ignore
		}

		expect(await models().organizations().activeInvitationCount(org.id)).toBe(10);
	});

});
