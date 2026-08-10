import config from '../config';

export interface BannerInfo {
	background_color: string;
	text_color: string;
	logo_title: string;
	logo_url: string;
	logoDataUrl: string;
}

export const getDefaultBannerInfo = () => {
	const output: BannerInfo = {
		background_color: '#ffffff',
		text_color: '#4a4a4a',
		logo_title: 'Joplin',
		logo_url: config().joplinAppBaseUrl,
		logoDataUrl: '',
	};

	return output;
};
