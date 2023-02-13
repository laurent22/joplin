import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import MarkdownIt = require('markdown-it');
import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';

const router: Router = new Router(RouteType.Web);
router.public = true;

router.get('terms', async (_path: SubPath, _ctx: AppContext) => {
	const markdownIt = new MarkdownIt();
	return markdownIt.render(`# **Joplin Cloud** usage terms and conditions

Welcome to our website. If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern JOPLIN’s relationship with you in relation to this website. JOPLIN is the owner of this website, Joplin Cloud. If you disagree with any part of these terms and conditions, please do not use our website.

The term ‘Joplin Cloud’ or ‘us’ or ‘we’ refers to the owner of the website whose registered office is 3 Place Simone Veil, CS 20739
54064 Nancy. SIREN: RCS Nancy 919 395 087. The term ‘you’ refers to the user or viewer of our website.

The use of this website is subject to the following terms of use:

- The content of the pages of this website is for your general information and use only. It is subject to change without notice.

- This website uses cookies to save login session. If you do not allow cookies to be used, you will not be able to login to the website.

- Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.

- Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.

- This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.

- All trademarks reproduced in this website, which are not the property of, or licensed to the operator, are acknowledged on the website.

- Unauthorised use of this website may give rise to a claim for damages and/or be a criminal offence.

- From time to time, this website may also include links to other websites. These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s). We have no responsibility for the content of the linked website(s).

- Your use of this website and any dispute arising out of such use of the website is subject to the laws of France.

- Please contact us at [${markdownUtils.escapeTitleText(config().supportEmail)}](mailto:${markdownUtils.escapeLinkUrl(config().supportEmail)}) for any question.`);
});

export default router;
