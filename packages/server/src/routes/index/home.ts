import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { accountByType, accountTypeToString } from '../../models/UserModel';
import { formatMaxItemSize, yesOrNo } from '../../utils/strings';

const router: Router = new Router(RouteType.Web);

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		const accountProps = accountByType(ctx.joplin.owner.account_type);

		const view = defaultView('home', 'Home');
		view.content = {
			userProps: [
				{
					label: 'Account Type',
					value: accountTypeToString(accountProps.account_type),
					show: true,
				},
				{
					label: 'Is Admin',
					value: yesOrNo(ctx.joplin.owner.is_admin),
					show: !!ctx.joplin.owner.is_admin,
				},
				{
					label: 'Max Item Size',
					value: formatMaxItemSize(ctx.joplin.owner),
					show: true,
				},
				{
					label: 'Can Share Note',
					value: yesOrNo(true),
					show: true,
				},
				{
					label: 'Can Share Notebook',
					value: yesOrNo(accountProps.can_share_folder),
					show: true,
				},
			],
		};

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
