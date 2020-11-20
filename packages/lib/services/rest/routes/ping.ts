import { Request } from '../Api';
import { ErrorMethodNotAllowed } from '../utils/errors';

export default async function(request: Request) {
	if (request.method === 'GET') {
		return 'JoplinClipperServer';
	}

	throw new ErrorMethodNotAllowed();
}
