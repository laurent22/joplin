import shim from '@joplin/lib/shim';
import { basename } from '@joplin/utils/path';
import Share from 'react-native-share';

const shareFile = async (path: string, mime: string) => {
	if (shim.mobilePlatform() === 'web') {
		const downloadLink = document.createElement('a');

		const file = await shim.fsDriver().fileAtPath(path);
		const downloadUrl = URL.createObjectURL(file);
		downloadLink.href = downloadUrl;
		downloadLink.download = basename(path);

		document.body.appendChild(downloadLink);
		downloadLink.click();
		downloadLink.remove();

		// While it might be fine to revoke the object URL
		// immediately after download starts, it also might not be.
		// See https://stackoverflow.com/a/71164969
		shim.setTimeout(() => {
			URL.revokeObjectURL(downloadUrl);
		}, 10000);
	} else {
		await Share.open({
			type: mime,
			filename: basename(path),
			url: `file://${path}`,
			failOnCancel: false,
		});
	}
};

export default shareFile;
