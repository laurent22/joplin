import { ItemEvent } from '@joplin/lib/components/shared/config/plugins/types';
import { Linking } from 'react-native';
import getPluginHelpUrl from '@joplin/lib/services/plugins/utils/getPluginHelpUrl';

const openWebsiteForPlugin = ({ item }: ItemEvent) => {
	return Linking.openURL(getPluginHelpUrl(item.manifest.id));
};

export default openWebsiteForPlugin;
