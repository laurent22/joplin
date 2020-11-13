import { tempContainerPrefix } from './types';

export default function(itemKey: string): boolean {
	return itemKey.indexOf(tempContainerPrefix) === 0;
}
