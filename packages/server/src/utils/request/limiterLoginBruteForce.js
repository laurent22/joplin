"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const errors_1 = require("../errors");
const limiterSlowBruteByIP = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 10,
    duration: 60, // Per 60 seconds
});
function default_1(ip) {
    return __awaiter(this, void 0, void 0, function* () {
        // Tests need to make many requests quickly so we disable it in this case.
        if (process.env.JOPLIN_IS_TESTING === '1')
            return;
        try {
            yield limiterSlowBruteByIP.consume(ip);
        }
        catch (error) {
            const result = error;
            throw new errors_1.ErrorTooManyRequests(`Too many login attempts. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=limiterLoginBruteForce.js.map