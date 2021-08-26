import { BaseItemEntity } from '../../services/database/types';

export default function(_resource: BaseItemEntity): boolean {
	return true;
	// return !resource.is_shared && !resource.share_id;
}
