import { expect, Locator } from '@playwright/test';

const extendedExpect = expect.extend({
	async toBeSeekableMediaElement(videoLocator: Locator, seeksTo: number, playsUntil: number) {
		let pass = true;

		let nextAssertionStep = '';
		const assertionName = 'toBeSeekableMediaElement';
		let resultMessage = () => `${assertionName}: Passed`;

		try {
			await extendedExpect(videoLocator).toBeVisible();

			const getDuration = () => {
				return videoLocator.evaluate((video) => {
					if (!(video instanceof HTMLMediaElement)) {
						throw new Error('Not a media element');
					}

					return video.duration;
				});
			};

			nextAssertionStep = 'Media should be long enough to seek and play';
			await extendedExpect.poll(getDuration).toBeGreaterThanOrEqual(Math.max(seeksTo, playsUntil));

			nextAssertionStep = 'Should not have a loading error';
			await extendedExpect(videoLocator).toHaveJSProperty('error', null);

			nextAssertionStep = `Should seek to ${this.utils.printExpected(seeksTo)}`;
			await videoLocator.evaluate((video: HTMLMediaElement, playsFrom: number) => {
				video.pause();
				video.currentTime = playsFrom;
			}, seeksTo);

			const getCurrentTime = () => {
				return videoLocator.evaluate((video: HTMLVideoElement) => {
					return video.currentTime;
				});
			};
			await extendedExpect.poll(getCurrentTime).toBeCloseTo(seeksTo);

			nextAssertionStep = `Should play until ${this.utils.printExpected(playsUntil)}`;
			await videoLocator.evaluate((video: HTMLMediaElement) => video.play());
			await extendedExpect.poll(getCurrentTime).toBeGreaterThan(playsUntil);
		} catch (error) {
			pass = false;
			resultMessage = () => error.toString();
		}

		return {
			pass,
			message: () => `${assertionName}: ${nextAssertionStep}:\n  ${resultMessage()}`,
			name: assertionName,
		};
	},
});

export default extendedExpect;
