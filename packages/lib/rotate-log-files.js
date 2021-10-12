const fs = require('fs').promises;
const path = require('path');

// It will look for log.txt and if it is found of size more than 10MB then it will be renamed with a timestamp.
// Further it will look for a log-{Timestamp}.txt file and if it is older than 30 days then it will be deleted

const rotateLogFile = async (dirpath) => {
	try {
		const files = await fs.readdir(dirpath);
		if (files.includes('log.txt')) {
			const stats = await fs.stat(path.join(dirpath, 'log.txt'));
			const logSize = (stats.size) / 1000000;
			if (logSize > 10) {
				await fs.rename(path.join(dirpath, 'log.txt'), path.join(dirpath, `log-${new Date().toISOString()}.txt`));
			}
		}
		files.forEach((item) => {
			if (item.includes('log-') && item.endsWith('.txt')) {
				const logName = item.replace('.txt', '');
				const logDate = new Date(logName.replace('log-','')).getTime();
				const currentDate = new Date().getTime();
				const days = (currentDate - logDate) / (24 * 3600 * 1000);
				if (days >= 30) {
					fs.unlink(path.join(dirpath, item)).then(() => console.log('Old log file was deleted')).catch((err) => console.log(err));
				}

			}
		});
	} catch (error) {
		console.log(error);
	}
};

export default rotateLogFile;
