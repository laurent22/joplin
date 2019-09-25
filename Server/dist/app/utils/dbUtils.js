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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("../db");
// This transaction handler allows abstracting away the complexity of managing nested transactions
// within models.
// Any method in a model can start a transaction and, if one is already started, it
// simply won't do anything. The last active transaction commits the results. If a rollback
// happens, the following calls to rollback will be a no-op.
// Set logEnabled_ to `true` to see what happens with nested transactions.
var TransactionHandler = /** @class */ (function () {
    function TransactionHandler() {
        this.db_ = null;
        this.transactionStack_ = [];
        this.activeTransaction_ = null;
        this.transactionIndex_ = 0;
        this.logEnabled_ = false;
        this.db_ = db_1.default;
    }
    Object.defineProperty(TransactionHandler.prototype, "db", {
        get: function () {
            return this.db_;
        },
        enumerable: true,
        configurable: true
    });
    TransactionHandler.prototype.log = function (s) {
        if (!this.logEnabled_)
            return;
        console.info("TransactionHandler: " + s);
    };
    Object.defineProperty(TransactionHandler.prototype, "activeTransaction", {
        get: function () {
            return this.activeTransaction_;
        },
        enumerable: true,
        configurable: true
    });
    TransactionHandler.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var txIndex, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        txIndex = ++this.transactionIndex_;
                        this.log("Starting transaction: " + txIndex);
                        if (!!this.transactionStack_.length) return [3 /*break*/, 2];
                        if (this.activeTransaction_)
                            throw new Error('An active transaction was found when no transaction was in stack'); // Sanity check
                        this.log("Trying to acquire transaction: " + txIndex);
                        _a = this;
                        return [4 /*yield*/, this.db.transaction()];
                    case 1:
                        _a.activeTransaction_ = _b.sent();
                        this.log("Got transaction: " + txIndex);
                        _b.label = 2;
                    case 2:
                        this.transactionStack_.push(txIndex);
                        return [2 /*return*/, txIndex];
                }
            });
        });
    };
    TransactionHandler.prototype.finishTransaction = function (txIndex) {
        if (!this.transactionStack_.length)
            throw new Error('Committing but no transaction was started');
        var lastTxIndex = this.transactionStack_.pop();
        if (lastTxIndex !== txIndex)
            throw new Error("Committing a transaction but was not last to start one: " + txIndex + ". Expected: " + lastTxIndex);
        return !this.transactionStack_.length;
    };
    TransactionHandler.prototype.commit = function (txIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var isLastTransaction;
            return __generator(this, function (_a) {
                this.log("Commit transaction: " + txIndex);
                isLastTransaction = this.finishTransaction(txIndex);
                if (isLastTransaction) {
                    this.log("Is last transaction - doing commit: " + txIndex);
                    this.activeTransaction_.commit();
                    this.activeTransaction_ = null;
                }
                return [2 /*return*/];
            });
        });
    };
    TransactionHandler.prototype.rollback = function (txIndex) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.log("Rollback transaction: " + txIndex);
                this.finishTransaction(txIndex);
                if (this.activeTransaction_) {
                    this.log("Transaction is active - doing rollback: " + txIndex);
                    this.activeTransaction_.rollback();
                    this.activeTransaction_ = null;
                }
                return [2 /*return*/];
            });
        });
    };
    return TransactionHandler;
}());
exports.transactionHandler = new TransactionHandler();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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L0I7Ozs7S0FDRDtJQUVLLHFDQUFRLEdBQWQsVUFBZSxPQUFjOzs7Z0JBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsMkJBQXlCLE9BQVMsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO29CQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLDZDQUEyQyxPQUFTLENBQUMsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO2lCQUMvQjs7OztLQUNEO0lBRUYseUJBQUM7QUFBRCxDQW5FQSxBQW1FQyxJQUFBO0FBRVksUUFBQSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUMiLCJmaWxlIjoiZGJVdGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkYiBmcm9tICcuLi9kYic7XG5pbXBvcnQgKiBhcyBLbmV4IGZyb20gJ2tuZXgnO1xuXG4vLyBUaGlzIHRyYW5zYWN0aW9uIGhhbmRsZXIgYWxsb3dzIGFic3RyYWN0aW5nIGF3YXkgdGhlIGNvbXBsZXhpdHkgb2YgbWFuYWdpbmcgbmVzdGVkIHRyYW5zYWN0aW9uc1xuLy8gd2l0aGluIG1vZGVscy5cbi8vIEFueSBtZXRob2QgaW4gYSBtb2RlbCBjYW4gc3RhcnQgYSB0cmFuc2FjdGlvbiBhbmQsIGlmIG9uZSBpcyBhbHJlYWR5IHN0YXJ0ZWQsIGl0XG4vLyBzaW1wbHkgd29uJ3QgZG8gYW55dGhpbmcuIFRoZSBsYXN0IGFjdGl2ZSB0cmFuc2FjdGlvbiBjb21taXRzIHRoZSByZXN1bHRzLiBJZiBhIHJvbGxiYWNrXG4vLyBoYXBwZW5zLCB0aGUgZm9sbG93aW5nIGNhbGxzIHRvIHJvbGxiYWNrIHdpbGwgYmUgYSBuby1vcC5cbi8vIFNldCBsb2dFbmFibGVkXyB0byBgdHJ1ZWAgdG8gc2VlIHdoYXQgaGFwcGVucyB3aXRoIG5lc3RlZCB0cmFuc2FjdGlvbnMuXG5jbGFzcyBUcmFuc2FjdGlvbkhhbmRsZXIge1xuXG5cdGRiXzpLbmV4PGFueSwgYW55W10+ID0gbnVsbDtcblx0dHJhbnNhY3Rpb25TdGFja186bnVtYmVyW10gPSBbXTtcblx0YWN0aXZlVHJhbnNhY3Rpb25fOktuZXguVHJhbnNhY3Rpb24gPSBudWxsO1xuXHR0cmFuc2FjdGlvbkluZGV4XzpudW1iZXIgPSAwO1xuXHRsb2dFbmFibGVkXzpib29sZWFuID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5kYl8gPSBkYjtcblx0fVxuXG5cdGdldCBkYigpOktuZXg8YW55LCBhbnlbXT4ge1xuXHRcdHJldHVybiB0aGlzLmRiXztcblx0fVxuXG5cdGxvZyhzOnN0cmluZyk6dm9pZCB7XG5cdFx0aWYgKCF0aGlzLmxvZ0VuYWJsZWRfKSByZXR1cm47XG5cdFx0Y29uc29sZS5pbmZvKGBUcmFuc2FjdGlvbkhhbmRsZXI6ICR7c31gKTtcblx0fVxuXG5cdGdldCBhY3RpdmVUcmFuc2FjdGlvbigpOktuZXguVHJhbnNhY3Rpb24ge1xuXHRcdHJldHVybiB0aGlzLmFjdGl2ZVRyYW5zYWN0aW9uXztcblx0fVxuXG5cdGFzeW5jIHN0YXJ0KCk6UHJvbWlzZTxudW1iZXI+IHtcblx0XHRjb25zdCB0eEluZGV4ID0gKyt0aGlzLnRyYW5zYWN0aW9uSW5kZXhfO1xuXHRcdHRoaXMubG9nKGBTdGFydGluZyB0cmFuc2FjdGlvbjogJHt0eEluZGV4fWApO1xuXG5cdFx0aWYgKCF0aGlzLnRyYW5zYWN0aW9uU3RhY2tfLmxlbmd0aCkge1xuXHRcdFx0aWYgKHRoaXMuYWN0aXZlVHJhbnNhY3Rpb25fKSB0aHJvdyBuZXcgRXJyb3IoJ0FuIGFjdGl2ZSB0cmFuc2FjdGlvbiB3YXMgZm91bmQgd2hlbiBubyB0cmFuc2FjdGlvbiB3YXMgaW4gc3RhY2snKTsgLy8gU2FuaXR5IGNoZWNrXG5cdFx0XHR0aGlzLmxvZyhgVHJ5aW5nIHRvIGFjcXVpcmUgdHJhbnNhY3Rpb246ICR7dHhJbmRleH1gKTtcblx0XHRcdHRoaXMuYWN0aXZlVHJhbnNhY3Rpb25fID0gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbigpO1xuXHRcdFx0dGhpcy5sb2coYEdvdCB0cmFuc2FjdGlvbjogJHt0eEluZGV4fWApO1xuXHRcdH1cblxuXHRcdHRoaXMudHJhbnNhY3Rpb25TdGFja18ucHVzaCh0eEluZGV4KTtcblx0XHRyZXR1cm4gdHhJbmRleDtcblx0fVxuXG5cdHByaXZhdGUgZmluaXNoVHJhbnNhY3Rpb24odHhJbmRleDpudW1iZXIpOmJvb2xlYW4ge1xuXHRcdGlmICghdGhpcy50cmFuc2FjdGlvblN0YWNrXy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignQ29tbWl0dGluZyBidXQgbm8gdHJhbnNhY3Rpb24gd2FzIHN0YXJ0ZWQnKTtcblx0XHRjb25zdCBsYXN0VHhJbmRleCA9IHRoaXMudHJhbnNhY3Rpb25TdGFja18ucG9wKCk7XG5cdFx0aWYgKGxhc3RUeEluZGV4ICE9PSB0eEluZGV4KSB0aHJvdyBuZXcgRXJyb3IoYENvbW1pdHRpbmcgYSB0cmFuc2FjdGlvbiBidXQgd2FzIG5vdCBsYXN0IHRvIHN0YXJ0IG9uZTogJHt0eEluZGV4fS4gRXhwZWN0ZWQ6ICR7bGFzdFR4SW5kZXh9YCk7XG5cdFx0cmV0dXJuICF0aGlzLnRyYW5zYWN0aW9uU3RhY2tfLmxlbmd0aDtcblx0fVxuXG5cdGFzeW5jIGNvbW1pdCh0eEluZGV4Om51bWJlcik6UHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhpcy5sb2coYENvbW1pdCB0cmFuc2FjdGlvbjogJHt0eEluZGV4fWApO1xuXHRcdGNvbnN0IGlzTGFzdFRyYW5zYWN0aW9uID0gdGhpcy5maW5pc2hUcmFuc2FjdGlvbih0eEluZGV4KTtcblx0XHRpZiAoaXNMYXN0VHJhbnNhY3Rpb24pIHtcblx0XHRcdHRoaXMubG9nKGBJcyBsYXN0IHRyYW5zYWN0aW9uIC0gZG9pbmcgY29tbWl0OiAke3R4SW5kZXh9YCk7XG5cdFx0XHR0aGlzLmFjdGl2ZVRyYW5zYWN0aW9uXy5jb21taXQoKTtcblx0XHRcdHRoaXMuYWN0aXZlVHJhbnNhY3Rpb25fID0gbnVsbDtcblx0XHR9XG5cdH1cblxuXHRhc3luYyByb2xsYmFjayh0eEluZGV4Om51bWJlcik6UHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhpcy5sb2coYFJvbGxiYWNrIHRyYW5zYWN0aW9uOiAke3R4SW5kZXh9YCk7XG5cdFx0dGhpcy5maW5pc2hUcmFuc2FjdGlvbih0eEluZGV4KTtcblx0XHRpZiAodGhpcy5hY3RpdmVUcmFuc2FjdGlvbl8pIHtcblx0XHRcdHRoaXMubG9nKGBUcmFuc2FjdGlvbiBpcyBhY3RpdmUgLSBkb2luZyByb2xsYmFjazogJHt0eEluZGV4fWApO1xuXHRcdFx0dGhpcy5hY3RpdmVUcmFuc2FjdGlvbl8ucm9sbGJhY2soKTtcblx0XHRcdHRoaXMuYWN0aXZlVHJhbnNhY3Rpb25fID0gbnVsbDtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgY29uc3QgdHJhbnNhY3Rpb25IYW5kbGVyID0gbmV3IFRyYW5zYWN0aW9uSGFuZGxlcigpO1xuIl19
