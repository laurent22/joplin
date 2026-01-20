import { join } from 'path';
import notarizeFile from './notarizeFile';

interface Params {
	appOutDir: string;
	packager: {
		appInfo: {
			productFilename: string;
		};
	};
}

export default async (params: Params) => {
	const appPath = join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
	await notarizeFile(appPath);
};
