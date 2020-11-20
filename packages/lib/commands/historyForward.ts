import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
import { _ } from '../locale';

export const declaration: CommandDeclaration = {
	name: 'historyForward',
	label: () => _('Forward'),
	iconName: 'icon-forward',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			utils.store.dispatch({
				type: 'HISTORY_FORWARD',
			});
		},
		enabledCondition: 'historyhasForwardNotes',
	};
};
