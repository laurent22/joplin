import { AclAction } from '../../models/BaseModel';
import { Models } from '../../models/factory';
import { User } from '../../services/database/types';
import { Services } from '../../services/types';

const checkCanCreateUser = async (
	_services: Services,
	models: Models,
	currentUser: User,
) => {
	await models.user().checkIfAllowed(currentUser, AclAction.Create);
};

export default checkCanCreateUser;
