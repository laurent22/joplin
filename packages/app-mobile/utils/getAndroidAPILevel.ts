
import { Platform } from 'react-native';

const getAndroidAPILevel = () => {
	if (Platform.OS !== 'android') {
		return 0;
	}

	return Platform.Version;
};

export default getAndroidAPILevel;
