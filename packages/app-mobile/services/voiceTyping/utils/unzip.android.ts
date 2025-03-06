
import { unzip } from 'react-native-zip-archive';

export default async (source: string, target: string) => {
	await unzip(source, target);
};
