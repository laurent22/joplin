import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'historyBackward',
	label: () => _('Back'),
	// iconName: 'fa-arrow-left',
	iconName: 'icon-back',
};

interface Props {
	hasBackwardNotes: boolean,
}

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			if (!props.hasBackwardNotes) return;
			utils.store.dispatch({
				type: 'HISTORY_BACKWARD',
			});
		},
		isEnabled: (props:Props) => {
			return props.hasBackwardNotes;
		},
		mapStateToProps: (state:any) => {
			return { hasBackwardNotes: state.backwardHistoryNotes.length > 0 };
		},
	};
};
