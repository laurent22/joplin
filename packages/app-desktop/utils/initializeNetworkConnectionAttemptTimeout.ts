const net = require('net') as typeof import('net') & {
	getDefaultAutoSelectFamilyAttemptTimeout: ()=> number;
	setDefaultAutoSelectFamilyAttemptTimeout: (value: number)=> void;
};

export default () => {
	// Prior to Node 26, the default value is 250 ms, which is too low in some situations. Increase the default to match the Node 26
	// default of 500 ms, at least until the app is upgraded to Node 26
	net.setDefaultAutoSelectFamilyAttemptTimeout(Math.max(net.getDefaultAutoSelectFamilyAttemptTimeout(), 500));
};
