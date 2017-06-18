let time = {

	unix() {
		return Math.round((new Date()).getTime() / 1000);
	},

	unixMs() {
		return (new Date()).getTime();
	},

	unixMsToS(ms) {
		return Math.round(ms / 1000);
	}

}

export { time };