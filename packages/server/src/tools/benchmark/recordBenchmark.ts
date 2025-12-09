import shim from '@joplin/lib/shim';
import { getRootDir } from '@joplin/utils';
import Logger from '@joplin/utils/Logger';
import { writeFile } from 'fs/promises';

const logger = Logger.create('benchmark');

const computeAverage = (data: number[]) => {
	const total = data.reduce((a, b) => a + b, 0);
	return total / (data.length || 1);
};

const computeStandardDeviation = (data: number[]) => {
	const average = computeAverage(data);
	// Variance(X) = average square distance from the mean
	//             = average((x - average(X))^2 : for all (x in X))
	const variance = computeAverage(data.map((x) => Math.pow(x - average, 2)));
	const standardDeviation = Math.sqrt(variance);
	return standardDeviation;
};

const computeStatistics = (data: number[]) => {
	return { average: computeAverage(data), standardDeviation: computeStandardDeviation(data) };
};

type TrialLabel = Record<string, string|number>;
interface LabelledInputs<DataPoint> {
	labels: TrialLabel;
	data: DataPoint;
}

interface BenchmarkOptions<InputData> {
	// Brief label of the task (to be used for column headers
	// in the output file)
	taskLabel: string;
	// Should run the task once
	runTask: (dataPoint: InputData)=> Promise<void>;

	// Returns data in groups
	batchIterator: AsyncIterable<LabelledInputs<InputData>[]>;
	// Number of times to re-test the performance of each group of data
	trialCount: number;

	outputFile: string;
}

const recordBenchmark = async <DataPoint> ({ batchIterator: inputData, trialCount: trials, outputFile, taskLabel, runTask: runTrial }: BenchmarkOptions<DataPoint>) => {
	logger.info('Creating benchmark for', outputFile);
	let page = 0;

	const results = [];
	const dataPointToDurations = new Map<TrialLabel, number[]>();
	for await (const batch of inputData) {
		logger.info('Page', page, '. Preparing to process', batch.length, 'items...');
		page++;

		for (let trial = 0; trial < trials; trial ++) {
			logger.info('Trial', trial);
			for (const item of batch) {
				const startTime = performance.now();
				await runTrial(item.data);
				const endTime = performance.now();
				const duration = endTime - startTime;

				const values = dataPointToDurations.get(item.labels);
				if (values) {
					values.push(duration);
				} else {
					dataPointToDurations.set(item.labels, [duration]);
				}
			}
		}

		for (const [labels, durations] of dataPointToDurations) {
			const { average, standardDeviation } = computeStatistics(durations);

			results.push({
				...labels,
				[`Avg. ${taskLabel} duration (ms)`]: average,
				[`standardDeviation(${taskLabel} duration) (ms)`]: standardDeviation,
			});
		}
		dataPointToDurations.clear();
	}

	if (results.length === 0) {
		throw new Error('No data collected.');
	}


	const resultCsv = [
		Object.keys(results[0]).join(','),
		...results.map(result => Object.values(result).join(',')),
	].join('\n');

	const outputDir = `${await getRootDir()}/packages/server/benchmarks`;
	await shim.fsDriver().mkdir(outputDir);
	const outputPath = await shim.fsDriver().resolveRelativePathWithinDir(outputDir, outputFile);

	await writeFile(outputPath, resultCsv);
	logger.info('Done. Wrote output to', outputPath);
};

export default recordBenchmark;
