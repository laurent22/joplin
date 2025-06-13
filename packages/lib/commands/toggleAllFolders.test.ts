import { setupDatabase, switchClient } from '../testing/test-utils';
import { runtime } from './toggleAllFolders';
import Setting from '../models/Setting';
import { CommandContext } from '../services/CommandService';
import { defaultState } from '../reducer';

const command = runtime();

const makeContext = (): CommandContext => {
	return {
		state: defaultState,
		dispatch: ()=>{},
	};
};

describe('toggleAllFolders', () => {

	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
	});

	test('expanding all should expand the folders header, if previously collapsed', async () => {
		Setting.setValue('folderHeaderIsExpanded', false);

		// Collapsing all should leave the folder header as-is
		const context = makeContext();
		await command.execute(context, true);
		expect(Setting.value('folderHeaderIsExpanded')).toBe(false);

		// Expanding all should also expand the folder header
		await command.execute(context, false);
		expect(Setting.value('folderHeaderIsExpanded')).toBe(true);
	});

});
