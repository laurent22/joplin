let time = {

	unix() {
		return Math.round((new Date()).getTime() / 1000);
	}

}

export { time };