import { Request } from '../Api';
import { LoadOptions } from '../../../models/utils/types';
import requestFields from './requestFields';

export default function(request: Request, modelType: number): LoadOptions {
	const options: LoadOptions = {};
	const fields = requestFields(request, modelType);
	if (fields.length) options.fields = fields;
	return options;
}
