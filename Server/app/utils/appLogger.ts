import * as fs from 'fs-extra';
const { FsDriverNode } = require('lib/fs-driver-node');
const { Logger } = require('lib/logger');

const logDir = `${__dirname}/../../../logs`;
fs.mkdirpSync(logDir);

Logger.fsDriver_ = new FsDriverNode();
const logger = new Logger();
logger.addTarget('file', { path: `${logDir}/app.txt` });
logger.addTarget('console');

export default logger;
