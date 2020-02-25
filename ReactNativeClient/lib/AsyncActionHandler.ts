export default class AsyncActionHandler {

	queues_:any = {};
	processing_ = false;
	needProcessing_ = false;
	scheduleProcessingIID_:any = null;

	push(queueId:string, action:Function) {
		if (!this.queues_[queueId]) this.queues_[queueId] = {
			items: [],
		};

		this.queues_[queueId].items.push({ action: action });
		this.scheduleProcessing();
	}

	private scheduleProcessing() {
		if (this.scheduleProcessingIID_) {
			clearTimeout(this.scheduleProcessingIID_);
		}

		this.scheduleProcessingIID_ = setTimeout(() => {
			this.scheduleProcessingIID_ = null;
			this.processQueue();
		}, 100);
	}

	private async processQueue() {
		if (this.processing_) {
			this.scheduleProcessing();
			return;
		}

		this.processing_ = true;

		for (const queueId in this.queues_) {
			const queueItems = this.queues_[queueId].items;

			const itemCount = queueItems.length;
			if (!itemCount) continue;

			const item = queueItems[itemCount - 1];
			await item.action();
			this.queues_[queueId].items.splice(0, itemCount);
		}

		this.processing_ = false;
	}

	waitForAllDone(queueId:string) {
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (this.processing_) return;

				if (!this.queues_[queueId] || !this.queues_[queueId].items.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

}
