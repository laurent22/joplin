import { ModelType } from '../../../BaseModel';
import { Request, RequestMethod } from '../Api';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import ItemChange, { ChangeSinceIdOptions } from '../../../models/ItemChange';
import requestFields from '../utils/requestFields';

export default async function(request: Request, id: string = null, _link: string = null) {
	if (request.method === RequestMethod.GET) {
		const options: ChangeSinceIdOptions = {
			limit: 100,
			fields: requestFields(request, ModelType.ItemChange, ['id', 'item_type', 'item_id', 'type', 'created_time']),
		};

		if (!id) {
			if (!('cursor' in request.query)) {
				return {
					items: [],
					has_more: false,
					cursor: (await ItemChange.lastChangeId()).toString(),
				};
			} else {
				const cursor = Number(request.query.cursor);
				if (isNaN(cursor)) throw new ErrorBadRequest(`Invalid cursor: ${request.query.cursor}`);

				const changes = await ItemChange.changesSinceId(cursor, options);

				return {
					items: changes,
					has_more: changes.length >= options.limit,
					cursor: (changes.length ? changes[changes.length - 1].id : cursor).toString(),
				};
			}
		} else {
			const change = await ItemChange.load(id, { fields: options.fields });
			if (!change) throw new ErrorNotFound();
			return change;
		}
	}
}
