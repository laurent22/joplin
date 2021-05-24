import CronService from './CronService';
import EmailService from './EmailService';
import MustacheService from './MustacheService';
import ShareService from './ShareService';

export interface Services {
	share: ShareService;
	email: EmailService;
	cron: CronService;
	mustache: MustacheService;
}
