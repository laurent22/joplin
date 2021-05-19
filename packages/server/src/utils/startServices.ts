import { AppContext } from './types';

export default function startServices(appContext: AppContext) {
	void appContext.services.share.runInBackground();
	void appContext.services.email.runInBackground();
}
