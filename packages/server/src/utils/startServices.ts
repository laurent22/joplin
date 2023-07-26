import { Services } from '../services/types';

export default async function startServices(services: Services) {
	void services.tasks.runInBackground();
}
