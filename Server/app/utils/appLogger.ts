const { FsDriverNode } = require('lib/fs-driver-node');
const { Logger } = require('lib/logger');
Logger.fsDriver_ = new FsDriverNode();
const logger = new Logger();

logger.addTarget('file', { path: `${__dirname}/../../../logs/app.txt` });
logger.addTarget('console');

export default logger;
