'use strict';


function defaultUrlFilter(url) {
	return url;
}


class VideoServiceBase {
	constructor(name, options, env) {
		this.name = name;
		this.options = Object.assign(this.getDefaultOptions(), options);
		this.env = env;
	}

	getDefaultOptions() {
		return {};
	}

	extractVideoID(reference) {
		return reference;
	}

	getVideoUrl() {
		throw new Error(null);
	}

	getFilteredVideoUrl(videoID) {
		let filterUrlDelegate =
      typeof this.env.options.filterUrl === 'function'? this.env.options.filterUrl: defaultUrlFilter;
		let videoUrl = this.getVideoUrl(videoID);
		return filterUrlDelegate(videoUrl, this.name, videoID, this.env.options);
	}

	getEmbedCode(videoID) {
		let containerClassNames = [];
		if (this.env.options.containerClassName) {
			containerClassNames.push(this.env.options.containerClassName);
		}

		let escapedServiceName = this.env.md.utils.escapeHtml(this.name);
		containerClassNames.push(
			this.env.options.serviceClassPrefix + escapedServiceName
		);

		let iframeAttributeList = [];
		iframeAttributeList.push(['type', 'text/html']);
		iframeAttributeList.push(['src', this.getVideoUrlYT(videoID)]);
		iframeAttributeList.push(['frameborder', 0]);

		if (this.env.options.outputPlayerSize === true) {
			if (this.options.width !== undefined && this.options.width !== null) {
				iframeAttributeList.push(['width', this.options.width]);
			}
			if (this.options.height !== undefined && this.options.height !== null) {
				iframeAttributeList.push(['height', this.options.height]);
			}
		}

		iframeAttributeList.push([
			'allow',
			'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture',
		]);

		if (this.env.options.allowFullScreen === true) {
			iframeAttributeList.push(['allowfullscreen']);
		}

		let iframeAttributes = iframeAttributeList
			.map(pair =>
				pair[1] !== undefined ? `${pair[0]}="${pair[1]}"` : pair[0]
			)
			.join(' ');

		return `<iframe ${iframeAttributes}></iframe>`;
	}
}


module.exports = VideoServiceBase;
