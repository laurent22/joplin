import { BaseItemEntity } from '../../services/database/types';

export default function(_resource: BaseItemEntity): boolean {
	// All items can now be encrypted, including published notes
	return true;
	// return !resource.is_shared;
}
