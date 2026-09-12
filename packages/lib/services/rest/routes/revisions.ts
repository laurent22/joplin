import defaultAction from '../utils/defaultAction';
import { ModelType } from '../../../BaseModel';
import { Request, RequestMethod } from '../Api';
import { ErrorForbidden } from '../utils/errors';
import isNoteLockEnabled from '../../noteLock/isNoteLockEnabled';
import Revision from '../../../models/Revision';

export default async function(request: Request, id: string = null, link: string = null) {
	// A revision is a JSON diff rather than a note body, so it cannot be served through a gated
	// load. Reading or changing a locked revision is refused outright; deletion is left open, as
	// it is for the note itself.
	if (isNoteLockEnabled() && id && (request.method === RequestMethod.GET || request.method === RequestMethod.PUT)) {
		const revision = await Revision.load(id, { fields: ['is_locked'] });
		if (revision && revision.is_locked) throw new ErrorForbidden('A locked revision cannot be accessed through the API');
	}
	const whereQuery = isNoteLockEnabled() ? { sql: 'is_locked = 0' } : null;
	return defaultAction(ModelType.Revision, request, id, link, ['id'], whereQuery);
}
