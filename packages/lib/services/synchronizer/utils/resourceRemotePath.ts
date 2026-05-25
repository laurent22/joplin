
import { Dirnames } from './types';
export default (resourceId: string) => {
	return `${Dirnames.Resources}/${resourceId}`;
};
