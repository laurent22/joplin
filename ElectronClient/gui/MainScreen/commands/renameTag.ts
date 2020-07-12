import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const Tag = require('lib/models/Tag');
const { _ } = require('lib/locale');
const { bridge } = require('electron').remote.require('./bridge');

export const declaration:CommandDeclaration = {
	name: 'renameTag',
	label: () => _('Rename'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ tagId }:any) => {
			const tag = await Tag.load(tagId);
			if (tag) {
				comp.setState({
					promptOptions: {
						label: _('Rename tag:'),
						value: Tag.getCachedFullTitle(tag.id),
						onClose: async (answer:string) => {
							if (answer !== null) {
								try {
									await Tag.renameNested(tag, answer);
								} catch (error) {
									bridge().showErrorMessageBox(error.message);
								}
							}
							comp.setState({ promptOptions: null });
						},
					},
				});
			}
		},
	};
};
