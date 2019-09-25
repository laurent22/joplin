"use strict";
// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(message, httpCode) {
        if (httpCode === void 0) { httpCode = 400; }
        var _this = _super.call(this, message) || this;
        _this.httpCode = httpCode;
        Object.setPrototypeOf(_this, ApiError.prototype);
        return _this;
    }
    return ApiError;
}(Error));
var ErrorMethodNotAllowed = /** @class */ (function (_super) {
    __extends(ErrorMethodNotAllowed, _super);
    function ErrorMethodNotAllowed(message) {
        if (message === void 0) { message = 'Method Not Allowed'; }
        var _this = _super.call(this, message, 405) || this;
        Object.setPrototypeOf(_this, ErrorMethodNotAllowed.prototype);
        return _this;
    }
    return ErrorMethodNotAllowed;
}(ApiError));
exports.ErrorMethodNotAllowed = ErrorMethodNotAllowed;
var ErrorNotFound = /** @class */ (function (_super) {
    __extends(ErrorNotFound, _super);
    function ErrorNotFound(message) {
        if (message === void 0) { message = 'Not Found'; }
        var _this = _super.call(this, message, 404) || this;
        Object.setPrototypeOf(_this, ErrorNotFound.prototype);
        return _this;
    }
    return ErrorNotFound;
}(ApiError));
exports.ErrorNotFound = ErrorNotFound;
var ErrorForbidden = /** @class */ (function (_super) {
    __extends(ErrorForbidden, _super);
    function ErrorForbidden(message) {
        if (message === void 0) { message = 'Forbidden'; }
        var _this = _super.call(this, message, 403) || this;
        Object.setPrototypeOf(_this, ErrorForbidden.prototype);
        return _this;
    }
    return ErrorForbidden;
}(ApiError));
exports.ErrorForbidden = ErrorForbidden;
var ErrorBadRequest = /** @class */ (function (_super) {
    __extends(ErrorBadRequest, _super);
    function ErrorBadRequest(message) {
        if (message === void 0) { message = 'Bad Request'; }
        var _this = _super.call(this, message, 400) || this;
        Object.setPrototypeOf(_this, ErrorBadRequest.prototype);
        return _this;
    }
    return ErrorBadRequest;
}(ApiError));
exports.ErrorBadRequest = ErrorBadRequest;
var ErrorUnprocessableEntity = /** @class */ (function (_super) {
    __extends(ErrorUnprocessableEntity, _super);
    function ErrorUnprocessableEntity(message) {
        if (message === void 0) { message = 'Unprocessable Entity'; }
        var _this = _super.call(this, message, 422) || this;
        Object.setPrototypeOf(_this, ErrorUnprocessableEntity.prototype);
        return _this;
    }
    return ErrorUnprocessableEntity;
}(ApiError));
exports.ErrorUnprocessableEntity = ErrorUnprocessableEntity;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbURBQW1EO0FBQ25ELCtJQUErSTs7Ozs7Ozs7Ozs7Ozs7O0FBRS9JO0lBQXVCLDRCQUFLO0lBRTNCLGtCQUFZLE9BQWMsRUFBRSxRQUFxQjtRQUFyQix5QkFBQSxFQUFBLGNBQXFCO1FBQWpELFlBQ0Msa0JBQU0sT0FBTyxDQUFDLFNBR2Q7UUFGQSxLQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7O0lBQ2pELENBQUM7SUFDRixlQUFDO0FBQUQsQ0FQQSxBQU9DLENBUHNCLEtBQUssR0FPM0I7QUFFRDtJQUEyQyx5Q0FBUTtJQUNsRCwrQkFBWSxPQUFxQztRQUFyQyx3QkFBQSxFQUFBLDhCQUFxQztRQUFqRCxZQUNDLGtCQUFNLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FFbkI7UUFEQSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUksRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7SUFDOUQsQ0FBQztJQUNGLDRCQUFDO0FBQUQsQ0FMQSxBQUtDLENBTDBDLFFBQVEsR0FLbEQ7QUFMWSxzREFBcUI7QUFPbEM7SUFBbUMsaUNBQVE7SUFDMUMsdUJBQVksT0FBNEI7UUFBNUIsd0JBQUEsRUFBQSxxQkFBNEI7UUFBeEMsWUFDQyxrQkFBTSxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBRW5CO1FBREEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFJLEVBQUUsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztJQUN0RCxDQUFDO0lBQ0Ysb0JBQUM7QUFBRCxDQUxBLEFBS0MsQ0FMa0MsUUFBUSxHQUsxQztBQUxZLHNDQUFhO0FBTzFCO0lBQW9DLGtDQUFRO0lBQzNDLHdCQUFZLE9BQTRCO1FBQTVCLHdCQUFBLEVBQUEscUJBQTRCO1FBQXhDLFlBQ0Msa0JBQU0sT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUVuQjtRQURBLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7SUFDdkQsQ0FBQztJQUNGLHFCQUFDO0FBQUQsQ0FMQSxBQUtDLENBTG1DLFFBQVEsR0FLM0M7QUFMWSx3Q0FBYztBQU8zQjtJQUFxQyxtQ0FBUTtJQUM1Qyx5QkFBWSxPQUE4QjtRQUE5Qix3QkFBQSxFQUFBLHVCQUE4QjtRQUExQyxZQUNDLGtCQUFNLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FFbkI7UUFEQSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUksRUFBRSxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7O0lBQ3hELENBQUM7SUFFRixzQkFBQztBQUFELENBTkEsQUFNQyxDQU5vQyxRQUFRLEdBTTVDO0FBTlksMENBQWU7QUFRNUI7SUFBOEMsNENBQVE7SUFDckQsa0NBQVksT0FBdUM7UUFBdkMsd0JBQUEsRUFBQSxnQ0FBdUM7UUFBbkQsWUFDQyxrQkFBTSxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBRW5CO1FBREEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFJLEVBQUUsd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUM7O0lBQ2pFLENBQUM7SUFDRiwrQkFBQztBQUFELENBTEEsQUFLQyxDQUw2QyxRQUFRLEdBS3JEO0FBTFksNERBQXdCIiwiZmlsZSI6ImVycm9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEZvciBleHBsYW5hdGlvbiBvZiB0aGUgc2V0UHJvdG90eXBlT2YgY2FsbCwgc2VlOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0LXdpa2kvYmxvYi9tYXN0ZXIvQnJlYWtpbmctQ2hhbmdlcy5tZCNleHRlbmRpbmctYnVpbHQtaW5zLWxpa2UtZXJyb3ItYXJyYXktYW5kLW1hcC1tYXktbm8tbG9uZ2VyLXdvcmtcblxuY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG5cdGh0dHBDb2RlOiBudW1iZXJcblx0Y29uc3RydWN0b3IobWVzc2FnZTpzdHJpbmcsIGh0dHBDb2RlOm51bWJlciA9IDQwMCkge1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXHRcdHRoaXMuaHR0cENvZGUgPSBodHRwQ29kZTtcblx0XHRPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgQXBpRXJyb3IucHJvdG90eXBlKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgRXJyb3JNZXRob2ROb3RBbGxvd2VkIGV4dGVuZHMgQXBpRXJyb3Ige1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlOnN0cmluZyA9ICdNZXRob2QgTm90IEFsbG93ZWQnKSB7XG5cdFx0c3VwZXIobWVzc2FnZSwgNDA1KTtcblx0XHRPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgRXJyb3JNZXRob2ROb3RBbGxvd2VkLnByb3RvdHlwZSk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEVycm9yTm90Rm91bmQgZXh0ZW5kcyBBcGlFcnJvciB7XG5cdGNvbnN0cnVjdG9yKG1lc3NhZ2U6c3RyaW5nID0gJ05vdCBGb3VuZCcpIHtcblx0XHRzdXBlcihtZXNzYWdlLCA0MDQpO1xuXHRcdE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBFcnJvck5vdEZvdW5kLnByb3RvdHlwZSk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEVycm9yRm9yYmlkZGVuIGV4dGVuZHMgQXBpRXJyb3Ige1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlOnN0cmluZyA9ICdGb3JiaWRkZW4nKSB7XG5cdFx0c3VwZXIobWVzc2FnZSwgNDAzKTtcblx0XHRPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgRXJyb3JGb3JiaWRkZW4ucHJvdG90eXBlKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgRXJyb3JCYWRSZXF1ZXN0IGV4dGVuZHMgQXBpRXJyb3Ige1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlOnN0cmluZyA9ICdCYWQgUmVxdWVzdCcpIHtcblx0XHRzdXBlcihtZXNzYWdlLCA0MDApO1xuXHRcdE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBFcnJvckJhZFJlcXVlc3QucHJvdG90eXBlKTtcblx0fVxuXG59XG5cbmV4cG9ydCBjbGFzcyBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkgZXh0ZW5kcyBBcGlFcnJvciB7XG5cdGNvbnN0cnVjdG9yKG1lc3NhZ2U6c3RyaW5nID0gJ1VucHJvY2Vzc2FibGUgRW50aXR5Jykge1xuXHRcdHN1cGVyKG1lc3NhZ2UsIDQyMik7XG5cdFx0T2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eS5wcm90b3R5cGUpO1xuXHR9XG59XG4iXX0=
