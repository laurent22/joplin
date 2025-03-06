import shim from '@joplin/lib/shim';
import * as exportDeletionLog from './exportDeletionLog';
import Setting from '@joplin/lib/models/Setting';
import { AppState, createAppDefaultState } from '../app.reducer';

jest.mock('../services/bridge', () => ({
	__esModule: true,
	default: () => ({
		openItem: jest.fn,
	}),
}));

const logContentWithDeleteAction = `
2024-09-17 18:34:28: Running migration: 20
2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 1
2024-09-17 18:34:28: Running migration: 27
2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 2
2024-09-17 18:34:28: Running migration: 33
2024-09-17 18:34:28: SearchEngine: Updating FTS table...
2024-09-17 18:34:28: Updating items_normalized from {"updated_time":0,"id":""}
2024-09-17 18:34:28: SearchEngine: Updated FTS table in 1ms. Inserted: 0. Deleted: 0
2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 3
2024-09-17 18:34:29: Running migration: 35
2024-09-17 18:34:29: SearchEngine: Updating FTS table...
2024-09-17 18:34:29: Updating items_normalized from {"updated_time":0,"id":""}
2024-09-17 18:34:29: SearchEngine: Updated FTS table in 1ms. Inserted: 0. Deleted: 0
2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 4
2024-09-17 18:34:29: Running migration: 42
2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 5
2024-09-17 18:34:29: App: "syncInfoCache" was changed - setting up encryption related code
`;

const createFakeLogFile = async (filename: string, content: string) => {
	await shim.fsDriver().writeFile(`${Setting.value('profileDir')}/${filename}`, content, 'utf8');
};

describe('exportDeletionLog', () => {
	let state: AppState = undefined;

	beforeAll(() => {
		state = createAppDefaultState({}, {});
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-09-18T12:00:00Z').getTime());
	});

	it('should get all deletion lines from the log file', async () => {
		await createFakeLogFile('log.txt', logContentWithDeleteAction);

		await exportDeletionLog.runtime().execute({ state, dispatch: () => {} });
		const result = await shim.fsDriver().readFile(`${Setting.value('profileDir')}/deletion_log_20240918.txt`, 'utf-8');
		expect(result).toBe(
			`2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 1
2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 2
2024-09-17 18:34:28: DeleteAction: MigrationService: ; Item IDs: 3
2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 4
2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 5
`);
	});

	it('should return a empty file if there is not deletion lines', async () => {
		await createFakeLogFile('log.txt', '');
		await exportDeletionLog.runtime().execute({ state, dispatch: () => {} });
		const result = await shim.fsDriver().readFile(`${Setting.value('profileDir')}/deletion_log_20240918.txt`, 'utf-8');
		expect(result).toBe('');
	});

	it('should ignore logs from log files that are not recent', async () => {
		const before = new Date('2024-09-16').getTime();
		const after = new Date('2024-09-17').getTime();
		await createFakeLogFile(`log-${before}.txt`, logContentWithDeleteAction);
		await createFakeLogFile(`log-${after}.txt`, '');
		await createFakeLogFile('log.txt', '');

		await exportDeletionLog.runtime().execute({ state, dispatch: () => {} });
		const result = await shim.fsDriver().readFile(`${Setting.value('profileDir')}/deletion_log_20240918.txt`, 'utf-8');
		expect(result).toBe('');
	});

	it('should contain the content from the recent log files', async () => {
		const rotateLog = new Date('2024-09-17').getTime();
		await createFakeLogFile(`log-${rotateLog}.txt`, '2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 4');
		await createFakeLogFile('log.txt', '2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 5');

		await exportDeletionLog.runtime().execute({ state, dispatch: () => {} });
		const result = await shim.fsDriver().readFile(`${Setting.value('profileDir')}/deletion_log_20240918.txt`, 'utf-8');
		expect(result).toBe(
			`2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 4
2024-09-17 18:34:29: DeleteAction: MigrationService: ; Item IDs: 5
`);
	});

	it('should contain the date in the filename', async () => {
		await shim.fsDriver().remove(`${Setting.value('profileDir')}/deletion_log_20230111.txt`);
		jest.setSystemTime(new Date('2023-01-11T12:00:00Z').getTime());
		await createFakeLogFile('log.txt', '');

		await exportDeletionLog.runtime().execute({ state, dispatch: () => {} });
		const exists = await shim.fsDriver().exists(`${Setting.value('profileDir')}/deletion_log_20230111.txt`);
		expect(exists).toBe(true);
	});

});
