import defaultAction from '../utils/defaultAction';
import { ModelType } from '../../../BaseModel';
import { Request, RequestMethod } from '../Api';
import { ErrorForbidden } from '../utils/errors';
import isNoteLockEnabled from '../../noteLock/isNoteLockEnabled';
import Revision from '../../../models/Revision';
import lockedNoteBodies from '../utils/lockedNoteBodies';

export default async function(request: Request, id: string = null, link: string = null) {
	// A revision is a JSON diff rather than a note body, so it cannot be served through a gated
	// load. A locked revision is read with a placeholder body and cannot be changed; deletion is
	// left open, as it is for the note itself.
	if (isNoteLockEnabled() && id && request.method === RequestMethod.PUT) {
		const revision = await Revision.load(id, { fields: ['is_locked'] });
		if (revision && revision.is_locked) throw new ErrorForbidden('A locked revision cannot be modified through the API');
	}
	if (isNoteLockEnabled() && request.method === RequestMethod.GET) {
		const lockedBodies = lockedNoteBodies(request, ModelType.Revision, ['id']);
		const result = await defaultAction(ModelType.Revision, lockedBodies.request, id, link, ['id']);
		return id ? lockedBodies.replace(result) : lockedBodies.replacePage(result);
	}
	return defaultAction(ModelType.Revision, request, id, link, ['id']);
}
