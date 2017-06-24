import moment from 'moment';

let time = {

	unix() {
		return Math.floor((new Date()).getTime() / 1000);
	},

	unixMs() {
		return (new Date()).getTime();
	},

	unixMsToS(ms) {
		return Math.floor(ms / 1000);
	},

	unixMsToIso(ms) {
		return moment.unix(ms / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
	},

}

export { time };