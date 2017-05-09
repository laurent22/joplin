import { BaseService } from 'src/base-service.js';

class SessionService extends BaseService {

	login(email, password, clientId) {
		return this.api_.post('sessions', null, {
			'email': email,
			'password': password,
			'client_id': clientId,
		});
	}

}

export { SessionService };