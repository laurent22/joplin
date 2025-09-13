
import dompurify = require('dompurify');

const sanitizeHtml = (html: string) => {
	return dompurify.sanitize(html);
};

export default sanitizeHtml;
