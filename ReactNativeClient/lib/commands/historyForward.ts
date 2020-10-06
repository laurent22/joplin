import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'historyForward',
	label: () => _('Forward'),
	iconName: 'icon-forward',
};

interface Props {
	hasForwardNotes: boolean,
}

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			if (!props.hasForwardNotes) return;
			utils.store.dispatch({
				type: 'HISTORY_FORWARD',
			});
		},
		isEnabled: (props:Props) => {
			return props.hasForwardNotes;
		},
		mapStateToProps: (state:any) => {
			return { hasForwardNotes: state.forwardHistoryNotes.length > 0 };
		},
	};
};
