import Logger from 'lib/Logger';
export default class BaseService {
    static logger_: Logger;
    protected instanceLogger_: Logger;
    logger(): Logger;
    setLogger(v: Logger): void;
}
