"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const Api_1 = require("../Api");
const uuid_1 = require("../../../uuid");
let authToken = null;
async function default_1(request, id = null, _link = null, context = null) {
    if (request.method === 'POST') {
        authToken = uuid_1.default.createNano();
        context.dispatch({
            type: 'API_AUTH_TOKEN_SET',
            value: authToken,
        });
        return { auth_token: authToken };
    }
    if (request.method === 'GET') {
        if (id === 'check') {
            if ('auth_token' in request.query) {
                if (context.authToken && request.query.auth_token === context.authToken.value) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                    const output = {
                        status: context.authToken.status,
                    };
                    if (context.authToken.status === Api_1.AuthTokenStatus.Accepted) {
                        output.token = context.token;
                    }
                    return output;
                }
                else {
                    throw new Error(`Invalid auth token: ${request.query.auth_token}`);
                }
            }
            if ('token' in request.query) {
                const isValid = request.query.token === context.token;
                if (isValid) {
                    context.dispatch({
                        type: 'API_AUTH_LOGIN',
                        value: true,
                    });
                }
                return { valid: isValid };
            }
        }
    }
    throw new Error('Invalid request');
}
