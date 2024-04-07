import { Request } from '../Api';
import requestFields from './requestFields';

export default function(request: Request, modelType: number) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const options: any = {};
	const fields = requestFields(request, modelType);
	if (fields.length) options.fields = fields;
	return options;
}
