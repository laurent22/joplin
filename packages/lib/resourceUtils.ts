const imageMimeTypes = [
	'image/cgm',
	'image/fits',
	'image/g3fax',
	'image/gif',
	'image/ief',
	'image/jp2',
	'image/jpeg',
	'image/jpm',
	'image/jpx',
	'image/naplps',
	'image/png',
	'image/prs.btif',
	'image/prs.pti',
	'image/svg+xml',
	'image/t38',
	'image/tiff',
	'image/tiff-fx',
	'image/vnd.adobe.photoshop',
	'image/vnd.cns.inf2',
	'image/vnd.djvu',
	'image/vnd.dwg',
	'image/vnd.dxf',
	'image/vnd.fastbidsheet',
	'image/vnd.fpx',
	'image/vnd.fst',
	'image/vnd.fujixerox.edmics-mmr',
	'image/vnd.fujixerox.edmics-rlc',
	'image/vnd.globalgraphics.pgb',
	'image/vnd.microsoft.icon',
	'image/vnd.mix',
	'image/vnd.ms-modi',
	'image/vnd.net-fpx',
	'image/vnd.sealed.png',
	'image/vnd.sealedmedia.softseal.gif',
	'image/vnd.sealedmedia.softseal.jpg',
	'image/vnd.svf',
	'image/vnd.wap.wbmp',
	'image/vnd.xiff',
];

const escapeQuotes = (str: string) => str.replace(/"/g, '&quot;');

export const attributesToStr = (attributes: Record<string, string>) =>
	Object.entries(attributes)
		.map(([key, value]) => ` ${key}="${escapeQuotes(value)}"`)
		.join('');

interface ElementProps {
	src: string;
	attributes: Record<string, string>;
	id?: string;
	alt?: string;
}

export const attachmentElement = ({ src, attributes, id }: ElementProps) =>
	[
		`<a href=':/${id}' ${attributesToStr(attributes)}>`,
		`  ${attributes.alt || src}`,
		'</a>',
	].join('');

export const imgElement = ({ src, attributes }: ElementProps) =>
	`<img src="${src}" ${attributesToStr(attributes)} />`;

export const audioElement = ({ src, alt, id }: ElementProps) =>
	[
		'<audio controls preload="none" style="width:480px;">',
		`	<source src="${src}" type="audio/mp4" />`,
		'	<p>',
		'		Your browser does not support HTML5 audio.',
		'	</p>',
		'</audio>',
		'<p>',
		`  <a href="${src}">`,
		`    ${alt || src || id || 'Download audio'}`,
		'  </a>',
		'</p>',
	].map(s => s.trim()).join('');

export const isImageMimeType = (m: string) => imageMimeTypes.indexOf(m) >= 0;

const resourceUtils = {
	imgElement,
	audioElement,
	attachmentElement,
	attributesToStr,
	isImageMimeType,
};

export default resourceUtils;
