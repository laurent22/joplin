import { RankResponse } from 'src/types/types';

// Defines the contract for managing communication between the IPythonProcessManagers
// and the RankingService class
//
// Implementations of this interface are responsible for:
// - getting the suggestions
//
// Examples:
// - RankingService
// - MockRankingService (for testing)
export interface RankingServiceApi {
	//  Retrieves context-aware synonym suggestions for a target word.
	//
	//  The method sends the selected word and its surrounding sentence
	//  to the ranking pipeline, which evaluates candidate synonyms and
	//  returns the highest-ranked recommendations.
	//
	//  @param word The selected word for which synonym suggestions are requested.
	//              Example: `"large"`
	//
	//  @param sentence The full sentence containing the selected word.
	//                  This context is used by the ranking engine to determine
	//                  which synonyms best preserve the original meaning.
	//                  Example: `"The large building overlooks the river."`
	//
	//  @returns A promise that resolves to a {@link RankResponse} containing
	//           the ranked synonym suggestions and their associated confidence scores.
	//
	//  @example
	//  const response = await rankingService.getSuggestions(
	//    "large",
	//    "The large building overlooks the river."
	//  );
	//
	//  console.log(response.results);
	//  // [
	//  //   { word: "huge", score: 0.92 },
	//  //   { word: "massive", score: 0.89 }
	//  // ]
	getSuggestions(word: string, sentence: string): Promise<RankResponse>;
}
