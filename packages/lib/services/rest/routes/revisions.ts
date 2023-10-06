import defaultAction from '../utils/defaultAction';
import { ModelType } from '../../../BaseModel';
import { Request } from '../Api';

export default async function(request: Request, id: string = null, link: string = null) {
	return defaultAction(ModelType.Revision, request, id, link, ['id']);
}
