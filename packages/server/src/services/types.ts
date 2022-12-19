import EmailService from './EmailService';
import MustacheService from './MustacheService';
import ShareService from './ShareService';
import TaskService from './TaskService';
import UserDeletionService from './UserDeletionService';

export interface Services {
	share: ShareService;
	email: EmailService;
	mustache: MustacheService;
	tasks: TaskService;
	userDeletion: UserDeletionService;
}
