import { Request } from '../Api';
import requestFields from './requestFields';

export default function(request: Request, modelType: number) {
	const options: any = {};
	const fields = requestFields(request, modelType);
	if (fields.length) options.fields = fields;
	return options;
}
