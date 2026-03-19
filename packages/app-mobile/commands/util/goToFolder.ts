import Folder from '@joplin/lib/models/Folder';
import NavService from '@joplin/lib/services/NavService';

const goToFolder = async (id: string) => {
	if (!(await Folder.load(id))) {
		throw new Error(`No folder with id ${id}`);
	}
	return NavService.go('Notes', { folderId: id });
};

export default goToFolder;
