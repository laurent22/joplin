import { Services } from '../services/types';

export default async function startServices(services: Services) {
	void services.share.runInBackground();
	void services.email.runInBackground();
	void services.tasks.runInBackground();
}
