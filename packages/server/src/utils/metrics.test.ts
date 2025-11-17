import uuid from '@joplin/lib/uuid';
import { clearMetrics, heartbeatMessage, onRequestComplete, onRequestStart } from './metrics';
import { Minute, Second } from './time';

describe('metrics', () => {

	beforeEach(() => {
		clearMetrics();
		jest.useFakeTimers({
			// Timers need to auto-advance to support node-os-utils.
			advanceTimers: true,
		});
	});

	it('should generate a heartbeat message', async () => {
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

	it('should count the number of requests per minute', async () => {
		const mockRequest = () => {
			const id = uuid.create();
			onRequestStart(id);
			onRequestComplete(id);
		};

		for (let i = 0; i < 10; i++) {
			mockRequest();
			jest.advanceTimersByTime(Second);
		}
		expect(await heartbeatMessage()).toMatch(/Req: 10 \/ min/);

		jest.advanceTimersByTime(Minute * 15);
		expect(await heartbeatMessage()).toMatch(/Req: 0 \/ min/);
		mockRequest();
		expect(await heartbeatMessage()).toMatch(/Req: 1 \/ min/);

		jest.advanceTimersByTime(Minute * 2);
		mockRequest();
		jest.advanceTimersByTime(Second * 10);
		mockRequest();
		expect(await heartbeatMessage()).toMatch(/Req: 2 \/ min/);
	});

});
