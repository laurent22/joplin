import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');
const Folder = require('lib/models/Folder');
const { bridge } = require('electron').remote.require('./bridge');

export const declaration:CommandDeclaration = {
	name: 'newNotebook',
	label: () => _('New notebook'),
	iconName: 'fa-book',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ parentId }:any) => {
			comp.setState({
				promptOptions: {
					label: _('Notebook title:'),
					onClose: async (answer:string) => {
						if (answer) {
							let folder = null;
							try {
								const toSave:any = { title: answer };
								if (parentId) toSave.parent_id = parentId;
								folder = await Folder.save(toSave, { userSideValidation: true });
							} catch (error) {
								bridge().showErrorMessageBox(error.message);
							}

							if (folder) {
								comp.props.dispatch({
									type: 'FOLDER_SELECT',
									id: folder.id,
								});
							}
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		mapStateToProps: (state:any):any => {
			return {
				selectedNoteIds: state.selectedNoteIds,
				notes: state.notes,
			};
		},
		title: () => {
			return _('New notebook');
		},
	};
};
