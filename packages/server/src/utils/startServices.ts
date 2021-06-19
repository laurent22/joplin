import { AppContext } from './types';

export default async function startServices(appContext: AppContext) {
	const services = appContext.services;

	void services.share.runInBackground();
	void services.email.runInBackground();
	void services.cron.runInBackground();
}
