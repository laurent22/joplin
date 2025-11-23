"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LimitedDownloadController = void 0;
const Logger_1 = require("@joplin/utils/Logger");
const JoplinError_1 = require("./JoplinError");
const errors_1 = require("./errors");
const bytes_1 = require("@joplin/utils/bytes");
const logger = Logger_1.default.create('downloadController');
class LimitedDownloadController {
    constructor(maxTotalBytes, maxImagesCount, requestId) {
        this.totalBytes_ = 0;
        // counts before the downloaded has finished, so at the end if the totalBytes > maxTotalBytesAllowed
        // it means that imageCount will be higher than the total downloaded during the process
        this.imagesCount_ = 0;
        // how many images links the content has
        this.imageCountExpected_ = 0;
        this.requestId = '';
        this.maxTotalBytes = 0;
        this.maxTotalBytes = maxTotalBytes;
        this.maxImagesCount = maxImagesCount;
        this.requestId = requestId;
    }
    set totalBytes(value) {
        if (this.totalBytes_ >= this.maxTotalBytes) {
            throw new JoplinError_1.default(`${this.requestId}: Total bytes stored (${this.totalBytes_}) has exceeded the amount established (${this.maxTotalBytes})`, errors_1.ErrorCode.DownloadLimiter);
        }
        this.totalBytes_ = value;
    }
    get totalBytes() {
        return this.totalBytes_;
    }
    set imagesCount(value) {
        if (this.imagesCount_ > this.maxImagesCount) {
            throw new JoplinError_1.default(`${this.requestId}: Total images to be stored (${this.imagesCount_}) has exceeded the amount established (${this.maxImagesCount})`, errors_1.ErrorCode.DownloadLimiter);
        }
        this.imagesCount_ = value;
    }
    get imagesCount() {
        return this.imagesCount_;
    }
    set imageCountExpected(value) {
        this.imageCountExpected_ = value;
    }
    get imageCountExpected() {
        return this.imageCountExpected_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    handleChunk(request) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return (chunk) => {
            try {
                this.totalBytes += chunk.length;
            }
            catch (error) {
                request.destroy(error);
            }
        };
    }
    printStats() {
        const totalBytes = `Total downloaded: ${(0, bytes_1.bytesToHuman)(this.totalBytes)}. Maximum: ${(0, bytes_1.bytesToHuman)(this.maxTotalBytes)}`;
        const totalImages = `Images initiated for download: ${this.imagesCount_}. Maximum: ${this.maxImagesCount}. Expected: ${this.imageCountExpected}`;
        logger.info(`${this.requestId}: ${totalBytes}`);
        logger.info(`${this.requestId}: ${totalImages}`);
    }
    limitMessage() {
        if (this.imagesCount_ > this.maxImagesCount) {
            return `The maximum image count of ${this.maxImagesCount} has been exceeded. Image count in your content: ${this.imageCountExpected}`;
        }
        if (this.totalBytes >= this.maxTotalBytes) {
            return `The maximum content size ${(0, bytes_1.bytesToHuman)(this.maxTotalBytes)} has been exceeded. Content size: (${(0, bytes_1.bytesToHuman)(this.totalBytes)})`;
        }
        return '';
    }
}
exports.LimitedDownloadController = LimitedDownloadController;
