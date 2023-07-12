import shim from '@joplin/lib/shim';
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';

const exportProfile = async (profileExportPath: string) => {
	const dbPath = '/data/data/net.cozic.joplin/databases';
	const exportPath = profileExportPath;
	const resourcePath = `${exportPath}/resources`;
	try {
		const copyFiles = async (source: string, dest: string) => {
			await shim.fsDriver().mkdir(dest);

			const files = await shim.fsDriver().readDirStats(source);

			for (const file of files) {
				const source_ = `${source}/${file.path}`;
				const dest_ = `${dest}/${file.path}`;
				if (!file.isDirectory()) {
					reg.logger().info(`Copying profile: ${source_} => ${dest_}`);
					await shim.fsDriver().copy(source_, dest_);
				} else {
					await copyFiles(source_, dest_);
				}
			}
		};
		await copyFiles(dbPath, exportPath);
		await copyFiles(Setting.value('resourceDir'), resourcePath);

		alert('Profile has been exported!');
	} catch (error) {
		alert(`Could not export files: ${error.message}`);
	}
};

export default exportProfile;
