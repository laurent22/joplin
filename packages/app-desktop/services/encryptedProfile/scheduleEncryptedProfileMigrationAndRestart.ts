import restart, { RestartResult } from '../restart';
import {
	EncryptExistingProfileDatabaseResult,
	scheduleEncryptedProfileMigration,
} from './encryptExistingProfileDatabase';

export type ScheduleEncryptedProfileMigrationAndRestartResult = EncryptExistingProfileDatabaseResult & {
	restartAttempted?: boolean;
	restartResult?: RestartResult;
};

export const scheduleEncryptedProfileMigrationAndRestart = async (
	profileDir: string,
	password: string,
	deps: {
		schedule?: typeof scheduleEncryptedProfileMigration;
		restart?: typeof restart;
	} = {},
): Promise<ScheduleEncryptedProfileMigrationAndRestartResult> => {
	const schedule = deps.schedule ?? scheduleEncryptedProfileMigration;
	const doRestart = deps.restart ?? restart;

	const result = await schedule(profileDir, password);
	if (!result.success) return result;

	const restartResult = await doRestart();
	return {
		...result,
		restartAttempted: true,
		restartResult,
	};
};
