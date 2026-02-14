import { extractResourceUrls } from '@joplin/lib/urlUtils';

const extractResourceIds = (text: string) => {
	return extractResourceUrls(text).map(item => item.itemId);
};

export default extractResourceIds;
