import { SubPath, redirect, respondWithFileContent2 } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { ErrorNotFound } from '../../utils/errors';

// function makeView(error: any = null): View {
// 	const view = defaultView('login');
// 	view.content.error = error;
// 	view.partials = ['errorBanner'];
// 	return view;
// }

const router: Router = new Router();

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file();
	const shareModel = ctx.models.share();

	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();

	const file = await fileModel.loadWithContent(share.file_id, { skipPermissionCheck: true });
	if (!file) throw new ErrorNotFound();
	return respondWithFileContent2(ctx, file);
});

export default router;
