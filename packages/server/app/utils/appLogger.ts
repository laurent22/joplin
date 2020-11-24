import * as fs from 'fs-extra';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import Logger, { TargetType } from '@joplin/lib/Logger';

const logDir = `${__dirname}/../../../logs`;
fs.mkdirpSync(logDir);

Logger.fsDriver_ = new FsDriverNode();
const logger = new Logger();
logger.addTarget(TargetType.File, { path: `${logDir}/app.txt` });
logger.addTarget(TargetType.Console);

export default logger;
