import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { accountTypeToString } from '../../models/UserModel';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanShareFolder, totalSizeClass } from '../../models/utils/user';

const router: Router = new Router(RouteType.Web);

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		const user = ctx.joplin.owner;

		const view = defaultView('home', 'Home');
		view.content = {
			userProps: [
				{
					label: 'Account Type',
					value: accountTypeToString(user.account_type),
					show: true,
				},
				{
					label: 'Is Admin',
					value: yesOrNo(user.is_admin),
					show: !!user.is_admin,
				},
				{
					label: 'Max Item Size',
					value: formatMaxItemSize(user),
					show: true,
				},
				{
					label: 'Total Size',
					classes: [totalSizeClass(user)],
					value: `${formatTotalSize(user)} (${formatTotalSizePercent(user)})`,
					show: true,
				},
				{
					label: 'Max Total Size',
					value: formatMaxTotalSize(user),
					show: true,
				},
				{
					label: 'Can Publish Note',
					value: yesOrNo(true),
					show: true,
				},
				{
					label: 'Can Share Notebook',
					value: yesOrNo(getCanShareFolder(user)),
					show: true,
				},
			],
		};

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
