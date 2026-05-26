/* eslint-disable import/prefer-default-export */

import { AllHtmlEntities as Entities } from 'html-entities';
const htmlentities = new Entities().encode;

export function escapeHtml(s: string) {
	return htmlentities(s);
}
