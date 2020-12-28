/* eslint-disable import/prefer-default-export */

const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

export function escapeHtml(s: string) {
	return htmlentities(s);
}
