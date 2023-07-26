import EmailService from './EmailService';
import MustacheService from './MustacheService';
import TaskService from './TaskService';
import UserDeletionService from './UserDeletionService';

export interface Services {
	email: EmailService;
	mustache: MustacheService;
	tasks: TaskService;
	userDeletion: UserDeletionService;
}
