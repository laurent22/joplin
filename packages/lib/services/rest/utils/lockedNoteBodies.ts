import { ModelType } from '../../../BaseModel';
import Revision from '../../../models/Revision';
import { ModelFeedPage } from '../../../models/utils/paginatedFeed';
import { lockedNoteBodyPlaceholder } from '../../noteLock/NoteLockNote';
import { Request } from '../Api';
import requestFields from './requestFields';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Items have whichever fields the request asked for
type Item = Record<string, any>;

// The API loads notes and revisions without the gate, so the body of a locked one is ciphertext.
// They are still returned, so that plugins can list locked notes, but with a placeholder body.
export default (request: Request, modelType: ModelType.Note | ModelType.Revision, defaultFields: string[] = null) => {
	const bodyField = modelType === ModelType.Revision ? 'body_diff' : 'body';
	const fields = requestFields(request, modelType, defaultFields);
	const allFields = fields.includes('*');
	// SQLite column names are case-insensitive, and the items use the requested spelling.
	const bodyKey = allFields ? bodyField : fields.find(f => f.toLowerCase() === bodyField);
	const lockKey = allFields ? 'is_locked' : fields.find(f => f.toLowerCase() === 'is_locked');
	const placeholder = modelType === ModelType.Revision ? Revision.createTextPatch('', lockedNoteBodyPlaceholder) : lockedNoteBodyPlaceholder;

	const replace = (item: Item) => {
		if (!bodyKey) return item;
		const output = { ...item };
		if (output[lockKey ?? 'is_locked']) output[bodyKey] = placeholder;
		if (!lockKey) delete output.is_locked;
		return output;
	};

	return {
		request: bodyKey && !lockKey ? { ...request, query: { ...request.query, fields: fields.concat('is_locked') } } : request,
		replace,
		replacePage: (page: ModelFeedPage) => ({ ...page, items: page.items.map(replace) }),
	};
};
