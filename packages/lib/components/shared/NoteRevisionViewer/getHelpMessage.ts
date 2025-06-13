import { _ } from '../../../locale';
import RevisionService from '../../../services/RevisionService';

const getHelpMessage = (restoreButtonTitle: string) => {
	return _('Click "%s" to restore the note. It will be copied in the notebook named "%s". The current version of the note will not be replaced or modified.', restoreButtonTitle, RevisionService.instance().restoreFolderTitle());
};

export default getHelpMessage;
