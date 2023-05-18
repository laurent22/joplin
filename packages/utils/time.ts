/* eslint-disable import/prefer-default-export */

export const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};
