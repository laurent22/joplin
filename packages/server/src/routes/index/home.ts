import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { accountTypeProperties, accountTypeToString } from '../../models/UserModel';
import { formatBytes } from '../../utils/bytes';
import { yesOrNo } from '../../utils/strings';

const router: Router = new Router(RouteType.Web);

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		const accountProps = accountTypeProperties(ctx.owner.account_type);

		const view = defaultView('home', 'Home');
		view.content = {
			userProps: [
				{
					label: 'Account Type',
					value: accountTypeToString(accountProps.account_type),
				},
				{
					label: 'Is Admin',
					value: yesOrNo(ctx.owner.is_admin),
				},
				{
					label: 'Max Item Size',
					value: accountProps.max_item_size ? formatBytes(accountProps.max_item_size) : '∞',
				},
				{
					label: 'Can Share Note',
					value: yesOrNo(true),
				},
				{
					label: 'Can Share Notebook',
					value: yesOrNo(accountProps.can_share_folder),
				},
			],
		};

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
