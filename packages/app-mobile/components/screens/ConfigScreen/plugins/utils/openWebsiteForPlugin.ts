import { ItemEvent } from '@joplin/lib/components/shared/config/plugins/types';
import { Linking } from 'react-native';

const openWebsiteForPlugin = ({ item }: ItemEvent) => {
	return Linking.openURL(`https://joplinapp.org/plugins/plugin/${item.manifest.id}`);
};

export default openWebsiteForPlugin;
