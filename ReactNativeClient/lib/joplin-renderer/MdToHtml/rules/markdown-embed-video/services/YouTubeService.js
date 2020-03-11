
'use strict';

const VideoServiceBase = require('./VideoServiceBase');


class YouTubeService extends VideoServiceBase {

	getDefaultOptions() {
		return { width: 560, height: 315 };
	}

	extractVideoID(reference) {
		let match = reference.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
		return match && match[7].length === 11 ? match[7] : reference;
		// group 7 captures the 11 digit unique ID which identifies every YouTUBE video
	}

	getVideoUrlYT(videoID) {
		let escapedVideoID = this.env.md.utils.escapeHtml(videoID);
		return `https://www.youtube.com/embed/${escapedVideoID}`;
	}

}


module.exports = YouTubeService;
