import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'historyBackward',
	label: () => _('Back'),
	iconName: 'fa-arrow-left',
};

interface Props {
	backwardHistoryNotes: any[],
}

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			if (!props.backwardHistoryNotes.length) return;
			utils.store.dispatch({
				type: 'HISTORY_BACKWARD',
			});
		},
		isEnabled: (props:Props) => {
			return props.backwardHistoryNotes.length > 0;
		},
		mapStateToProps: (state:any) => {
			return { backwardHistoryNotes: state.backwardHistoryNotes };
		},
	};
};
