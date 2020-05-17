const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const { substrWithEllipsis } = require('lib/string-utils');
const Folder = require('lib/models/Folder.js');
const { ORPHANS_FOLDER_ID, CONFLICT_FOLDER_ID } = require('lib/reserved-ids.js');

class SideBarUtils {

	static async confirmDeleteFolder(folderId, permanent = false) {
		if (!folderId || [CONFLICT_FOLDER_ID, ORPHANS_FOLDER_ID].includes(folderId)) { return; }

		const folder = await Folder.load(folderId);
		if (!folder) return;

		const msg = [
			'Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.',
			'Permanently delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be permanently deleted.',
		];

		const ok = bridge().showConfirmMessageBox(
			_(msg[permanent ? 1 : 0], substrWithEllipsis(folder.title, 0, 32)),
			{
				buttons: [_('Delete'), _('Cancel')],
				defaultId: 1,
			}
		);

		if (!ok) return;
		await Folder.delete(folderId, { permanent: permanent });
	}
}

module.exports = SideBarUtils;
