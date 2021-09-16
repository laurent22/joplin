import CronService from './CronService';
import EmailService from './EmailService';
import MustacheService from './MustacheService';
import ShareService from './ShareService';
import TaskService from './TaskService';

export interface Services {
	share: ShareService;
	email: EmailService;
	cron: CronService;
	mustache: MustacheService;
	tasks: TaskService;
}
