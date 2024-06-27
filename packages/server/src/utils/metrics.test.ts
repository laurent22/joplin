import { clearMetrics, heartbeatMessage, onRequestComplete, onRequestStart } from './metrics';

describe('metrics', () => {

	it('should generate a heartbeat message', async () => {
		clearMetrics();

		const requestId1 = Math.random().toString();
		const requestId2 = Math.random().toString();
		const requestId3 = Math.random().toString();

		onRequestStart(requestId1);
		onRequestStart(requestId2);
		onRequestStart(requestId3);
		onRequestComplete(requestId2);

		const regex = /Cpu: (.*?)%; Mem: (.*?) \/ (.*?) MB \((.*?)%\); Req: 3 \/ min; Active req: 2/;

		const message = await heartbeatMessage();

		const match = message.match(regex);
		expect(match.length).toBe(5);
		expect(Number(match[1])).toBeGreaterThan(0);
		expect(Number(match[2])).toBeLessThan(Number(match[3]));
		expect(Number(match[3])).toBeGreaterThan(0);
	});

});
