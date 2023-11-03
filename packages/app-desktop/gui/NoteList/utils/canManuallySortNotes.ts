import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../../../services/bridge';

const canManuallySortNotes = (notesParentType: string, noteSortOrder: string) => {
	if (notesParentType !== 'Folder') return false;

	if (noteSortOrder !== 'order') {
		const doIt = bridge().showConfirmMessageBox(_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by')), {
			buttons: [_('Do it now'), _('Cancel')],
		});
		if (!doIt) return false;

		Setting.setValue('notes.sortOrder.field', 'order');
		return false;
	}
	return true;
};

export default canManuallySortNotes;
