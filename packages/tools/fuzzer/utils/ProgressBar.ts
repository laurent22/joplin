import { stdout } from 'process';

export default class ProgressBar {
	private isFirst_ = true;
	private lastLength_ = 0;
	public constructor(private prefix_: string) {}
	public update(countDone: number, total: number) {
		if (!stdout.isTTY) return;

		if (this.isFirst_) {
			this.isFirst_ = false;
		}

		const percent = Math.round(countDone / total * 100);
		const message = `\r${this.prefix_}: ${percent}% (${countDone}/${total})`;
		stdout.write(message.padEnd(this.lastLength_));

		this.lastLength_ = message.length;
	}

	public complete() {
		if (!this.isFirst_) {
			stdout.write(`\r${this.prefix_}: Done`.padEnd(this.lastLength_));
			stdout.write('\n');
		}
	}
}

