const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

export default class JoplinUtils {
	escapeHtml(text: string): string {
		return htmlentities(text);
	}
}
