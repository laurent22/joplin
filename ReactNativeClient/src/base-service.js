import { Registry } from 'src/registry.js';

class BaseService {

	constructor() {}

	api() {
		return Registry.api();
	}

}

export { BaseService };