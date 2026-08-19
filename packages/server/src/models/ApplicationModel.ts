
import BaseModel, { AclAction, UuidType } from './BaseModel';
import { Application, NotificationLevel, User, Uuid } from '../services/database/types';
import { createSecureRandom } from '@joplin/lib/uuid';
import { hashPassword, checkPassword } from '../utils/auth';
import { ErrorBadRequest, ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';
import { ApplicationPlatform, ApplicationType } from '@joplin/lib/types';
import { validate } from 'uuid';
import Logger from '@joplin/utils/Logger';
import { NotificationKey } from './NotificationModel';
import { getEmptyIp } from '../db';

const logger = Logger.create('ApplicationModel');

export type ActiveApplication = Pick<Application, 'id' | 'version' | 'platform' | 'ip' | 'created_time' | 'last_access_time'>;

export type AppAuthResponse = {
	password: string;
	id: string;
};


type Client = {
	ip: string;
	version?: string;
	platform?: ApplicationPlatform;
	type?: ApplicationType;
};

type ApplicationNotFound = {
	status: 'unfinished';
	message: string;
};

type ApplicationCredential = {
	id: string;
	password: string;
	status: 'finished';
};

export type CreateAppPasswordResponse = ApplicationNotFound | ApplicationCredential;

const getPlatform = (platform: string) => {
	const platformAsInt = parseInt(platform, 10);
	if (ApplicationPlatform.Linux === platformAsInt) return ApplicationPlatform.Linux;
	if (ApplicationPlatform.Windows === platformAsInt) return ApplicationPlatform.Windows;
	if (ApplicationPlatform.MacOs === platformAsInt) return ApplicationPlatform.MacOs;
	if (ApplicationPlatform.Android === platformAsInt) return ApplicationPlatform.Android;
	if (ApplicationPlatform.Ios === platformAsInt) return ApplicationPlatform.Ios;
	return ApplicationPlatform.Unknown;
};

const getType = (type: string) => {
	const typeAsInt = parseInt(type, 10);
	if (ApplicationType.Desktop === typeAsInt) return ApplicationType.Desktop;
	if (ApplicationType.Mobile === typeAsInt) return ApplicationType.Mobile;
	if (ApplicationType.Cli === typeAsInt) return ApplicationType.Cli;
	return ApplicationType.Unknown;
};

export default class ApplicationModel extends BaseModel<Application> {

	protected get tableName(): string {
		return 'applications';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	private applicationAuthIdKey = (applicationAuthId: string) => `ApplicationAuthId::${applicationAuthId}`;

	public async createPreLoginRecord(applicationAuthId: string, ip: string, version?: string, platform?: string, type?: string) {
		const client: Client = {
			ip: ip,
			version: version || '',
			platform: getPlatform(platform),
			type: getType(type),
		};
		return this.models().keyValue().setValue(
			this.applicationAuthIdKey(applicationAuthId),
			JSON.stringify(client),
		);
	}

	private async getByApplicationAuthId(applicationAuthId: string) {
		const clientUnparsed = await this.models().keyValue().value<string>(this.applicationAuthIdKey(applicationAuthId));

		let client = null;

		try {
			client = JSON.parse(clientUnparsed);
		} catch (error) {
			// Mostly likely this is failing because the application was already authorized
			// and the value stored in the keyValue now is the ID to an application record
			throw new ErrorUnprocessableEntity(`Application Auth Id has already been used, go back to the Joplin application to finish the login process: ${applicationAuthId}`);
		}

		return client as Client;
	}

	// Joplin now has 2 methods of login, the one where the user uses
	// his email as the identifier and other where the client application
	// will use a generate id as the identifier
	//
	// If the id is a uuid means that is an application login
	public isApplicationId(id: string) {
		return validate(id);
	}

	private async createApplicationRecord(userId: Uuid, client: Client) {
		return this.save({
			user_id: userId,
			ip: client.ip || getEmptyIp(this.db),
			version: client.version,
			platform: client.platform,
			type: client.type,
		});
	}

	// if password is already set it means that the credentials retrieval
	// for this application has already happened
	private async getValidApplicationBeforeFirstLogin(applicationAuthId: string): Promise<Application> {
		const applicationAuthIdInformation = await this.models().keyValue().value<string>(this.applicationAuthIdKey(applicationAuthId));
		if (!validate(applicationAuthIdInformation)) throw new ErrorForbidden('Application not authorized yet.');

		const application = await this.db(this.tableName)
			.select(this.defaultFields)
			.where({ id: applicationAuthIdInformation, password: '' })
			.first();

		return application;
	}

	private generatePassword() {
		return createSecureRandom();
	}

	public async createAppPassword(applicationAuthId: string): Promise<CreateAppPasswordResponse> {
		return this.withTransaction(async () => {
			const application = await this.getValidApplicationBeforeFirstLogin(applicationAuthId);
			if (!application) return { status: 'unfinished', message: 'Application not found from Application Auth Id.' };

			const password = this.generatePassword();
			const hashedPassword = await hashPassword(password);
			await this.db(this.tableName)
				.update({ password: hashedPassword })
				.where({ id: application.id });

			await this.models().keyValue().deleteValue(this.applicationAuthIdKey(applicationAuthId));

			return { id: application.id, password, status: 'finished' };
		}, 'ApplicationModel::createAppPassword');
	}

	public async updateOnNewLogin(applicationId: string, client: Client) {
		if (!this.isApplicationId(applicationId)) return;

		const ip = client.ip;
		const platform = client.platform ?? ApplicationPlatform.Unknown;
		const type = client.type ?? ApplicationType.Unknown;
		const version = client.version ?? '';
		await this.db(this.tableName)
			.update({ last_access_time: Date.now(), ip, platform, type, version })
			.where({ id: applicationId });
	}

	public async login(id: string, password: string) {
		const application = await this.load(id, { fields: ['id', 'password', 'user_id'] });

		if (!application) {
			throw new ErrorForbidden(`Could not find application with id: "${id}"`);
		}

		if (!(await checkPassword(password, application.password))) {
			throw new ErrorForbidden('Invalid application or application password', { details: { application: id } });
		}

		const user = await this.models().user().load(application.user_id);
		if (!user) {
			logger.error(`Login was successful, but user was not found. User id: ${application.user_id}`);
			throw new ErrorUnprocessableEntity('Login was successful, but user was not found');
		}

		return { user, application };
	}

	public async onAuthorizeUse(applicationAuthId: string, userId: string) {
		return this.withTransaction(async () => {
			const client = await this.getByApplicationAuthId(applicationAuthId);

			if (!client) {
				throw new ErrorBadRequest(`Check if you are not already logged in on your Joplin application, client associated with this application auth id not found: ${applicationAuthId}`);
			}

			const application = await this.createApplicationRecord(userId, client);

			await this.models().keyValue().setValue(this.applicationAuthIdKey(applicationAuthId), application.id);
			await this.models().notification().add(userId, NotificationKey.Any, NotificationLevel.Important, 'You have successfully authorised your application');

			return application;
		}, 'ApplicationModel::onAuthorizeUse');
	}

	public async activeApplications(userId: Uuid): Promise<ActiveApplication[]> {
		if (!userId) return [];

		const result = await this.db
			.select(
				'a.id',
				'a.version',
				'a.platform',
				'a.ip',
				'a.created_time',
				'a.last_access_time',
			)
			.from('applications as a')
			.where('a.user_id', userId)
			.orderBy('a.last_access_time', 'desc');

		return result;
	}

	public async delete(applicationId: Uuid) {
		await this.withTransaction(async () => {
			await super.delete(applicationId);
			await super.models().session().deleteByApplicationId(applicationId);
		}, 'ApplicationModel::delete');
	}

	public getPlatformName(platform: number) {
		if (ApplicationPlatform.Linux === platform) return 'Linux';
		if (ApplicationPlatform.Windows === platform) return 'Windows';
		if (ApplicationPlatform.MacOs === platform) return 'MacOS';
		if (ApplicationPlatform.Android === platform) return 'Android';
		if (ApplicationPlatform.Ios === platform) return 'iOS';
		return 'Unknown';
	}

	public getTypeName(type: number) {
		if (ApplicationType.Desktop === type) return 'Desktop';
		if (ApplicationType.Mobile === type) return 'Mobile';
		if (ApplicationType.Cli === type) return 'Cli';
		return 'Unknown';
	}

	public async checkIfAllowed(user: User, _action: AclAction, resource: Application = null): Promise<void> {
		if (user.is_admin) return;
		if (resource.user_id !== user.id) throw new ErrorForbidden();
	}

	public async deleteByUserId(userId: Uuid) {
		const query = this.db(this.tableName).where('user_id', '=', userId);
		await query.delete();
	}
}
