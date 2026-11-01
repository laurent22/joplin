import { Dispatch } from 'redux';
import CommandService from '@joplin/lib/services/CommandService';
import { NoteLockPrompts } from '@joplin/lib/services/noteLock/noteLockPrompts';

const noteLockPrompts = (dispatch: Dispatch): NoteLockPrompts => ({
	promptPassword: async label => {
		const result: { answer: string|null } = await CommandService.instance().execute('showPrompt', { label, inputType: 'password' });
		return result.answer;
	},
	goToNoteLockSetup: () => {
		dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			props: { defaultSection: 'noteLock' },
		});
	},
});

export default noteLockPrompts;
