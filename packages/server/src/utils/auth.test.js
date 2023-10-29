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
const auth_1 = require("./auth");
describe('hashPassword', () => {
    it.each([
        'password',
        '123456',
        'simple-password-that-takes-is-long',
        'nuXUhqecx!RzK3wv6^xYaVEP%9fc$T%$E2k%9Q&TKvtDhR#2PUw3kA8KX3w2baAD8m#N9@52!DvfYn*X6hP#uAvpGF57*H9avcoePbR&4Q2XzckJnSW*EVm4G@a#YvnR',
        '$2a$10',
        '$2a$10$LMKVPiNOWDZhtw9NizNIEuNGLsjOxQAcrwQJ0lnKuiaOtyFgZEnwO',
    ])('should return a string that starts with $2a$10 for the password: %', (plainText) => __awaiter(void 0, void 0, void 0, function* () {
        expect((0, auth_1.hashPassword)(plainText).startsWith('$2a$10')).toBe(true);
    }));
});
//# sourceMappingURL=auth.test.js.map