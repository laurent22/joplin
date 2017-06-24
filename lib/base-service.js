import { Registry } from 'lib/registry.js';

class BaseService {

	constructor() {}

	api() {
		return Registry.api();
	}

}

export { BaseService };