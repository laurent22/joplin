
import { AuthTokenStatus, Request, RequestContext } from '../Api';
import uuid from '../../../uuid';

let authToken: string = null;

export default async function(request: Request, id: string = null, _link: string = null, context: RequestContext = null) {
	if (request.method === 'POST') {
		authToken = uuid.createNano();

		context.dispatch({
			type: 'API_AUTH_TOKEN_SET',
			value: authToken,
		});

		return { auth_token: authToken };
	}

	if (request.method === 'GET') {
		if (id === 'check') {
			if ('auth_token' in request.query) {
				if (context.authToken && request.query.auth_token === context.authToken.value) {
					const output: any = {
						status: context.authToken.status,
					};

					if (context.authToken.status === AuthTokenStatus.Accepted) {
						output.token = context.token;
					}

					return output;
				} else {
					throw new Error(`Invalid auth token: ${request.query.auth_token}`);
				}
			}

			if ('token' in request.query) {
				const isValid = request.query.token === context.token;

				if (isValid) {
					context.dispatch({
						type: 'API_AUTH_LOGIN',
						value: true,
					});
				}

				return { valid: isValid };
			}
		}
	}

	throw new Error('Invalid request');
}
