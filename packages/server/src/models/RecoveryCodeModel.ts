
import BaseModel, { UuidType } from './BaseModel';
import { EmailSender, RecoveryCode, Uuid } from '../services/database/types';
import { createSecureRandom, customAlphabetSecure } from '@joplin/lib/uuid';
import { ErrorForbidden } from '../utils/errors';
import { isValidMFACode } from '../utils/crypto';
import recoveryCodesAccessedTemplate from '../views/emails/recoveryCodesAccessedTemplate';
import { forgotPasswordUrl } from '../utils/urlUtils';
import { formatDateOnServer } from '../utils/time';
import { DbConnection } from '../db';
import { NewModelFactoryHandler } from './factory';
import { Config } from '../utils/types';

type RecoveryCodeAccess = {
	isValid: boolean;
	isNewlyCreated: boolean;
};

export default class RecoveryCodeModel extends BaseModel<RecoveryCode> {

	private readonly nanoid;

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		super(db, dbSlave, modelFactory, config);

		this.nanoid = customAlphabetSecure('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
	}

	protected get tableName(): string {
		return 'recovery_codes';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public generateNewCodes() {
		const quantity = 10;
		const codes = [];
		for (let i = 0; i < quantity; i++) {
			const code = this.nanoid();
			codes.push(code);
		}
		return codes;
	}

	public async saveCodes(codes: string[], userId: Uuid) {
		await this.withTransaction(async () => {
			await super.db(this.tableName)
				.where({ user_id: userId })
				.delete();

			for (const code of codes) {
				await super.save({
					user_id: userId,
					code,
					is_used: 0,
				});
			}
		}, 'RecoveryCodeModel::saveCodes');
	}

	private userFriendlyFormat(codeRecords: Partial<RecoveryCode>[]) {
		return codeRecords
			.map(record => {
				return {
					...record,
					code: `${record.code.slice(0, 5)}-${record.code.slice(5)}`.toUpperCase(),
				};
			})
			.sort((a, b) => {
				return a.is_used - b.is_used;
			});
	}

	public async loadByUserId(userId: Uuid) {
		const codes: Partial<RecoveryCode>[] = await this.db(this.tableName).select(['user_id', 'code', 'is_used']).where({ user_id: userId });
		return this.userFriendlyFormat(codes);
	}

	private normalizeRecoveryCode(recoveryCode: string) {
		return recoveryCode
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '');
	}

	public async verify(userId: Uuid, recoveryCode: string) {
		const normalized = this.normalizeRecoveryCode(recoveryCode);
		await this.withTransaction(async () => {
			const code = await super.db(this.tableName)
				.select(['id', 'user_id', 'code', 'is_used'])
				.where({ user_id: userId, is_used: 0, code: normalized })
				.first();

			if (!code) throw new ErrorForbidden('The recovery code is not valid or has already been used.');

			await super.db(this.tableName).update({ is_used: 1 }).where({ user_id: userId, code: normalized });
		}, 'RecoveryCode::verify');
	}

	public async checkCredentials(userId: Uuid, password?: string, mfaCode?: string) {
		const user = await this.models().user().load(userId, { fields: ['totp_secret'] });

		if (password) {
			const isPasswordValid = await this.models().user().isPasswordValid(userId, password);
			if (isPasswordValid) return;
		}

		if (mfaCode) {
			const isMfaCodeValid = await isValidMFACode(user.totp_secret, mfaCode);
			if (isMfaCodeValid) return;
		}

		throw new ErrorForbidden('Invalid password or authentication code');
	}

	public async saveRecoveryCodeAccessKey(userId: Uuid) {
		const accessKey = createSecureRandom();
		await this.models().keyValue().setValue(`RecoveryCode::accessKey::${userId}`, accessKey);
		return accessKey;
	}

	public async isRecoveryCodeAccessKeyValid(userId: Uuid, accessKey: string) {
		const recoveryCodeAccess = await this.withTransaction<RecoveryCodeAccess>(async () => {
			const record = await super.models().keyValue().value(`RecoveryCode::accessKey::${userId}`);

			if (record !== accessKey) return { isValid: false, isNewlyCreated: false };

			const isNewlyCreated = await super.models().keyValue().value(`RecoveryCode::isNewlyCreated::${userId}`);

			await super.models().keyValue().deleteValue(`RecoveryCode::accessKey::${userId}`);
			await super.models().keyValue().deleteValue(`RecoveryCode::isNewlyCreated::${userId}`);

			return { isValid: true, isNewlyCreated: !!isNewlyCreated };
		}, 'RecoveryCode::isRecoveryCodeAccessKeyValid');

		if (!recoveryCodeAccess.isValid) return recoveryCodeAccess;

		// We don't send email notification if it is just after MFA was enabled
		if (recoveryCodeAccess.isNewlyCreated) return recoveryCodeAccess;

		const user = await this.models().user().load(userId, { fields: ['email', 'full_name'] });
		await this.models().email().push({
			...recoveryCodesAccessedTemplate({
				accessTime: formatDateOnServer(Date.now()),
				changePasswordUrl: forgotPasswordUrl(),
			}),
			recipient_email: user.email,
			recipient_name: user.full_name,
			recipient_id: userId,
			sender_id: EmailSender.NoReply,
		});

		return recoveryCodeAccess;
	}

	public async regenerate(userId: Uuid) {
		const codes = this.generateNewCodes();
		await this.saveCodes(codes, userId);
	}
}
