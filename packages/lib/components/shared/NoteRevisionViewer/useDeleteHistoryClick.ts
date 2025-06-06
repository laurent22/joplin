import { _ } from '../../../locale';
import Revision from '../../../models/Revision';
import shim, { MessageBoxType } from '../../../shim';
const { useCallback } = shim.react();

interface Props {
	noteId?: string;
	setDeleting(deleting: boolean): void;
	resetScreenState(): void;
}

const useDeleteHistoryClick = ({
	noteId, setDeleting, resetScreenState,
}: Props) => {
	return useCallback(async () => {
		if (!noteId) return;
		const response = await shim.showMessageBox(_('Are you sure you want to delete all history for this note? This cannot be undone.'), {
			title: _('Warning'),
			buttons: [_('Yes'), _('No')],
			type: MessageBoxType.Confirm,
		});

		if (response === 0) {
			setDeleting(true);
			try {
				await Revision.deleteHistoryForNote(noteId);
				await shim.showMessageBox(_('Note history has been deleted.'), { type: MessageBoxType.Info });
			} finally {
				setDeleting(false);
			}
			resetScreenState();
		}
	}, [noteId, setDeleting, resetScreenState]);
};

export default useDeleteHistoryClick;
