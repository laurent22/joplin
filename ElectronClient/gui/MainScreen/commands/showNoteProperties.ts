import CommandService, { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'showNoteProperties',
	label: () => _('Note properties'),
	iconName: 'fa-info-circle',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteId }:any) => {
			comp.setState({
				notePropertiesDialogOptions: {
					noteId: noteId,
					visible: true,
					onRevisionLinkClick: () => {
						CommandService.instance().execute('showRevisions');
					},
				},
			});
		},
		isEnabled: (props:any) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any) => {
			return { noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null };
		},
	};
};
