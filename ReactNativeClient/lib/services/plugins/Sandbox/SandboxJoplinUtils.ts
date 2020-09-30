const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

export default class SandboxJoplinUtils {
	escapeHtml(text: string): string {
		return htmlentities(text);
	}
}
