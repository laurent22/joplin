import Setting from '@joplin/lib/models/Setting';
import { HeaderId } from '../../types';

const toggleHeader = (headerId: HeaderId) => {
	const settingKey = headerId === HeaderId.TagHeader ? 'tagHeaderIsExpanded' : 'folderHeaderIsExpanded';
	const current = Setting.value(settingKey);
	Setting.setValue(settingKey, !current);
};

export default toggleHeader;
