import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';

// function makeView(error: any = null): View {
// 	const view = defaultView('login');
// 	view.content.error = error;
// 	view.partials = ['errorBanner'];
// 	return view;
// }

const router: Router = new Router();

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const share = ctx.models.share().load(path.id);

	// const fileModel = ctx.models.file({ userId: ctx.owner.id });
	// let file: File = await fileModel.pathToFile(path.id, { returnFullEntity: false });
	// file = await fileModel.loadWithContent(file.id);
	// if (!file) throw new ErrorNotFound();
	// return respondWithFileContent(ctx.response, file);
});

export default router;
