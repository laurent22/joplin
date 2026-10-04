import config from '../config';
import { Models } from '../models/factory';

const showJoplinServerBusinessPromo = async (models: Models) => {
	if (config().isJoplinCloud || config().isJoplinServerBusiness) return false;
	return await models.user().enabledNonAdminUserCount() >= 3;
};

export default showJoplinServerBusinessPromo;
