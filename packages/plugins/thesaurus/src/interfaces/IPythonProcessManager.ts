import { RankRequest, RankResponse } from 'src/types/types';

// Defines the contract for managing communication between the TypeScript plugin
// and the external Python NLP process.
//
// Implementations of this interface are responsible for:
// - Starting the Python process.
// - Stopping the Python process.
// - Sending ranking requests to Python.
// - Receiving and parsing ranking responses.
//
// The purpose of using an interface is to decouple the service layer from a
// specific Python process implementation, enabling easier testing, mocking,
// and future replacement of the underlying communication mechanism.
//
// Examples:
// - PythonProcessManager
// - MockPythonProcessManager (for testing)
export interface PythonProcessManagerApi {
	//  Starts the Python NLP process and performs any required initialization.
	//
	//  This method should be called before sending requests to the ranking
	//  pipeline. Future implementations may use it to start a persistent worker
	//  process and preload NLP models.
	//
	//  @returns A promise that resolves when the Python process is ready to
	//           receive requests.
	start(): Promise<void>;

	//  Gracefully shuts down the Python NLP process and releases any associated
	//  resources.
	//
	//  This method should be called when the plugin is unloaded or when the
	//  ranking service is no longer required.
	//
	//  @returns A promise that resolves when the process has been terminated.
	stop(): Promise<void>;

	//  Sends a ranking request to the Python NLP pipeline and waits for the
	//  corresponding response.
	//
	//  The request contains the target word and its sentence context. The Python
	//  process is expected to analyze the request, rank candidate synonyms, and
	//  return the results using the agreed response schema.
	//
	//  @param request The ranking request to send to the NLP pipeline.
	//
	//  @returns A promise that resolves to a {@link RankResponse} containing the
	//           recommended synonyms and their ranking scores.
	//
	//  @example
	//  const response = await processManager.send({
	//    word: "large",
	//    sentence: "The large building overlooks the river."
	//  });
	//
	//  console.log(response.results);
	//  // [
	//  //   { word: "huge", score: 0.92 },
	//  //   { word: "massive", score: 0.89 }
	//  // ]
	send(request: RankRequest): Promise<RankResponse>;
}
