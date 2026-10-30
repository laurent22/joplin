import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	itemType: 'note' | 'notebook';
	publishedUrl: string;
	publishTime: string;
	changePasswordUrl: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	return {
		subject: `[${config().appName}] A ${view.itemType} was published from your account`,
		body: `

A ${view.itemType} was published from your account on ${view.publishTime}. Anyone with [this link](${markdownUtils.escapeLinkUrl(view.publishedUrl)}) can view it.

If this was you, no further action is needed.

If this wasn't you, someone might be using your account. Please unpublish the ${view.itemType} from the app and [change your password](${markdownUtils.escapeLinkUrl(view.changePasswordUrl)}).

`.trim(),
	};
};
