import { Organization, OrganizationUserInvitationStatus, UserFlagType, Uuid } from '../services/database/types';
import { ErrorBadRequest, ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUser, expectHttpError } from '../utils/testing/testUtils';
import { organizationInvitationConfirmUrl } from '../utils/urlUtils';
import { AccountType } from './UserModel';

const createOrg = async (props: Organization = null, orgNum: number = 1) => {
	const orgOwner = await createUser(1000 + orgNum);

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

	return models().organizations().userAssociatedOrganization(orgOwner.id);
};

const addUsers = async (orgId: Uuid, orgNum: number = 1) => {
	await models().organizations().addUsers(orgId, [
		`orguser${orgNum}-1@example.com`,
		`orguser${orgNum}-2@example.com`,
	]);
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

	test('should retrieve the user associated organisations', async () => {
		const org = await createOrg();
		const owner = await models().user().load(org.owner_id);

		{
			const o = await models().organizations().userAssociatedOrganization(owner.id);
			expect(o.id).toBe(org.id);
		}

		const randomUser = await createUser(1);

		{

			const o = await models().organizations().userAssociatedOrganization(randomUser.id);
			expect(o).toBeFalsy();
		}

		const orgUser = await models().organizations().inviteUser(org.id, 'test@example.com');
		await models().organizations().respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Accepted);

		{
			const u = await models().user().loadByEmail('test@example.com');
			const o = await models().organizations().userAssociatedOrganization(u.id);
			expect(o.id).toBe(org.id);
		}
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

	test('should remove users', async () => {
		const org = await createOrg({ max_users: 10 });
		await addUsers(org.id);

		expect((await models().organizationUsers().orgUsers(org.id)).length).toBe(2);

		const orgUser = await models().organizationUsers().orgUserByEmail(org.id, 'orguser1-2@example.com');
		await models().organizations().removeUser(org.id, orgUser.id);

		expect((await models().organizationUsers().orgUsers(org.id)).length).toBe(1);

		const removedUser = await models().user().load(orgUser.user_id);
		expect(removedUser.enabled).toBe(0);

		const flags = await models().userFlag().allByUserId(removedUser.id);
		expect(flags.length).toBe(1);
		expect(flags[0].type).toBe(UserFlagType.RemovedFromOrganization);
	});

	test('should check permissions when removing users', async () => {
		const org1 = await createOrg({ max_users: 10 }, 1);
		await addUsers(org1.id, 1);

		const org2 = await createOrg({ max_users: 10 }, 2);
		await addUsers(org2.id, 2);

		{
			const orgUser = await models().organizationUsers().orgUserByEmail(org1.id, 'orguser1-2@example.com');
			await expectHttpError(async () => models().organizations().removeUser(org2.id, orgUser.id), ErrorForbidden.httpCode);
		}

		{
			await expectHttpError(async () => models().organizations().removeUser(org2.id, 'notfound'), ErrorForbidden.httpCode);
		}
	});

});
