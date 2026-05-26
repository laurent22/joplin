import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../../../services/bridge';
import type { FolderDropLocation } from '../types';

const canManuallySortNotebooks = (dropLocation: FolderDropLocation) => {
	if (dropLocation === 'nest') return true;

	if (Setting.value('folders.sortOrder.field') !== 'order') {
		const doIt = bridge().showConfirmMessageBox(
			_('To manually sort the notebooks, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notebooks by')),
			{
				buttons: [_('Do it now'), _('Cancel')],
			},
		);
		if (!doIt) return false;

		Setting.setValue('folders.sortOrder.field', 'order');
		return false;
	}

	return true;
};

export default canManuallySortNotebooks;
