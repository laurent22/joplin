
'use strict';


function renderer(tokens, idx,) {
	let videoToken = tokens[idx];

	let service = videoToken.info.service;
	let videoID = videoToken.info.videoID;

	return service.getEmbedCode(videoID);
}


module.exports = renderer;
