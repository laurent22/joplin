// cSpell:disable
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
// cSpell:enable

type Attributes = Record<string, string>;

interface AttachmentElementOptions {
	src: string;
	attributes: Attributes;
	id: string;
}

interface ImgElementOptions {
	src: string;
	attributes: Attributes;
}

interface AudioElementOptions {
	src?: string;
	alt?: string;
	id?: string;
}

const escapeQuotes = (str: string): string => str.replace(/"/g, '&quot;');

export const attributesToStr = (attributes: Attributes): string =>
	Object.entries(attributes)
		.map(([key, value]) => ` ${key}="${escapeQuotes(value)}"`)
		.join('');

export const attachmentElement = ({ src, attributes, id }: AttachmentElementOptions): string =>
	[
		`<a href=':/${id}' ${attributesToStr(attributes)}>`,
		`  ${attributes.alt || src}`,
		'</a>',
	].join('');

export const imgElement = ({ src, attributes }: ImgElementOptions): string =>
	`<img src="${src}" ${attributesToStr(attributes)} />`;

export const audioElement = ({ src, alt, id }: AudioElementOptions): string =>
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

export const isImageMimeType = (m: string): boolean => imageMimeTypes.indexOf(m) >= 0;
