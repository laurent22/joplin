import { Services } from '../services/types';
import { Config } from './types';

export default async function startServices(config: Config, services: Services) {
	if (config.IS_ADMIN_INSTANCE) {
		void services.tasks.runInBackground();
	}
}
