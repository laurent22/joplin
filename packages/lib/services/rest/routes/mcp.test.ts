import Setting from '../../../models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { Request, RequestMethod } from '../Api';
import ApiResponse from '../ApiResponse';
import route_mcp from './mcp';

const makeRequest = (body: unknown) => {
	return {
		method: RequestMethod.POST,
		body: JSON.stringify(body),
	} as Request;
};

describe('routes/mcp', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('mcp.enabled', true);
	});

	test.each([
		['single notification', { jsonrpc: '2.0', method: 'notifications/initialized' }],
		['batch of notifications', [{ jsonrpc: '2.0', method: 'notifications/initialized' }]],
	])('should acknowledge %s with an empty 202', async (_description, payload) => {
		const response = await route_mcp(makeRequest(payload));

		// Strict MCP clients close the transport if this is a 200.
		expect(response).toBeInstanceOf(ApiResponse);
		expect((response as ApiResponse).status).toBe(202);
		expect((response as ApiResponse).body).toBe('');
	});

	test('should return the response body for regular requests', async () => {
		const response = await route_mcp(makeRequest({
			jsonrpc: '2.0', id: 1, method: 'initialize', params: {},
		}));

		expect(response).not.toBeInstanceOf(ApiResponse);
		expect((response as { id: number }).id).toBe(1);
	});

});
