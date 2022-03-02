import { BaseItemEntity } from '../../services/database/types';

export default function(resource: BaseItemEntity): boolean {
	return !resource.is_shared;
}
