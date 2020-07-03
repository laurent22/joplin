import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'historyForward',
	label: () => _('Forward'),
	iconName: 'fa-arrow-right',
};

interface Props {
	forwardHistoryNotes: any[],
}

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			if (!props.forwardHistoryNotes.length) return;
			utils.store.dispatch({
				type: 'HISTORY_FORWARD',
			});
		},
		isEnabled: (props:Props) => {
			return props.forwardHistoryNotes.length > 0;
		},
		mapStateToProps: (state:any) => {
			return { forwardHistoryNotes: state.forwardHistoryNotes };
		},
	};
};
