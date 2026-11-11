import uuid from '@joplin/lib/uuid';
import { clearMetrics, heartbeatMessage, onRequestComplete, onRequestStart } from './metrics';
import { Minute, Second } from './time';

describe('metrics', () => {

	beforeEach(() => {
		clearMetrics();
		jest.useFakeTimers();
	});

	it('should generate a heartbeat message', () => {
		const requestId1 = Math.random().toString();
		const requestId2 = Math.random().toString();
		const requestId3 = Math.random().toString();

		onRequestStart(requestId1);
		onRequestStart(requestId2);
		onRequestStart(requestId3);
		onRequestComplete(requestId2);

		jest.advanceTimersByTime(Second);

		const regex = /Cpu: (.*?)%; Mem: (.*?) \/ (.*?) MB \((.*?)%\); Req: 3 \/ min; Active req: 2/;

		const message = heartbeatMessage();

		const match = message.match(regex);
		expect(match.length).toBe(5);
		expect(Number(match[2])).toBeLessThan(Number(match[3]));
		expect(Number(match[3])).toBeGreaterThan(0);
	});

	it('should count the number of requests per minute', () => {
		const mockRequest = () => {
			const id = uuid.create();
			onRequestStart(id);
			onRequestComplete(id);
		};

		for (let i = 0; i < 10; i++) {
			mockRequest();
			jest.advanceTimersByTime(Second);
		}
		expect(heartbeatMessage()).toMatch(/Req: 10 \/ min/);

		jest.advanceTimersByTime(Minute * 15);
		expect(heartbeatMessage()).toMatch(/Req: 0 \/ min/);
		mockRequest();
		jest.advanceTimersByTime(Second);
		expect(heartbeatMessage()).toMatch(/Req: 1 \/ min/);

		jest.advanceTimersByTime(Minute * 2);
		mockRequest();
		jest.advanceTimersByTime(Second * 10);
		mockRequest();
		jest.advanceTimersByTime(Second);
		expect(heartbeatMessage()).toMatch(/Req: 2 \/ min/);
	});

});
