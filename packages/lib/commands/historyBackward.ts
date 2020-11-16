import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
import { _ } from '../locale';

export const declaration: CommandDeclaration = {
	name: 'historyBackward',
	label: () => _('Back'),
	iconName: 'icon-back',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			utils.store.dispatch({
				type: 'HISTORY_BACKWARD',
			});
		},
		enabledCondition: 'historyhasBackwardNotes',
	};
};
