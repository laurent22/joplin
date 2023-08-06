/* eslint-disable import/prefer-default-export */

export const msleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};
