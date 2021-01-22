import { Request } from '../Api';
import BaseItem from '../../../models/BaseItem';

function defaultFieldsByModelType(modelType: number): string[] {
	const ModelClass = BaseItem.getClassByItemType(modelType);
	const possibleFields = ['id', 'parent_id', 'title'];
	const output = [];
	for (const f of possibleFields) {
		if (ModelClass.hasField(f)) output.push(f);
	}
	return output;
}

export default function(request: Request, modelType: number) {
	const query = request.query;
	if (!query || !query.fields) return defaultFieldsByModelType(modelType);
	if (Array.isArray(query.fields)) return query.fields.slice();
	const fields = query.fields
		.split(',')
		.map((f: string) => f.trim())
		.filter((f: string) => !!f);
	return fields.length ? fields : defaultFieldsByModelType(modelType);
}
