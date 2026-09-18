import { FolderEntity, NoteEntity } from '../../../services/database/types';
import { StateShare } from '../../../services/share/reducer';
import useAsyncEffect from '../../../hooks/useAsyncEffect';
import ShareService from '../../../services/share/ShareService';
import shim from '../../../shim';
const { useState } = shim.react();

const useIsPublished = (item: NoteEntity|FolderEntity, shares: StateShare[]) => {
	const [isPublished, setIsPublished] = useState(false);

	useAsyncEffect(async (event) => {
		const shared = await ShareService.instance().isPublished(item, shares);

		if (!event.cancelled) {
			setIsPublished(shared);
		}
	}, [shares, item]);

	return isPublished;
};

export default useIsPublished;
