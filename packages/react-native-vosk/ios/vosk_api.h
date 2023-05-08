// Copyright 2020-2021 Alpha Cephei Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* This header contains the C API for Vosk speech recognition system */

#ifndef VOSK_API_H
#define VOSK_API_H

#ifdef __cplusplus
extern "C" {
#endif

/** Model stores all the data required for recognition
 *  it contains static data and can be shared across processing
 *  threads. */
typedef struct VoskModel VoskModel;


/** Speaker model is the same as model but contains the data
 *  for speaker identification. */
typedef struct VoskSpkModel VoskSpkModel;


/** Recognizer object is the main object which processes data.
 *  Each recognizer usually runs in own thread and takes audio as input.
 *  Once audio is processed recognizer returns JSON object as a string
 *  which represent decoded information - words, confidences, times, n-best lists,
 *  speaker information and so on */
typedef struct VoskRecognizer VoskRecognizer;


/** Loads model data from the file and returns the model object
 *
 * @param model_path: the path of the model on the filesystem
 * @returns model object or NULL if problem occured */
VoskModel *vosk_model_new(const char *model_path);


/** Releases the model memory
 *
 *  The model object is reference-counted so if some recognizer
 *  depends on this model, model might still stay alive. When
 *  last recognizer is released, model will be released too. */
void vosk_model_free(VoskModel *model);


/** Check if a word can be recognized by the model
 * @param word: the word
 * @returns the word symbol if @param word exists inside the model
 * or -1 otherwise.
 * Reminding that word symbol 0 is for <epsilon> */
int vosk_model_find_word(VoskModel *model, const char *word);


/** Loads speaker model data from the file and returns the model object
 *
 * @param model_path: the path of the model on the filesystem
 * @returns model object or NULL if problem occured */
VoskSpkModel *vosk_spk_model_new(const char *model_path);


/** Releases the model memory
 *
 *  The model object is reference-counted so if some recognizer
 *  depends on this model, model might still stay alive. When
 *  last recognizer is released, model will be released too. */
void vosk_spk_model_free(VoskSpkModel *model);

/** Creates the recognizer object
 *
 *  The recognizers process the speech and return text using shared model data
 *  @param model       VoskModel containing static data for recognizer. Model can be
 *                     shared across recognizers, even running in different threads.
 *  @param sample_rate The sample rate of the audio you going to feed into the recognizer.
 *                     Make sure this rate matches the audio content, it is a common
 *                     issue causing accuracy problems.
 *  @returns recognizer object or NULL if problem occured */
VoskRecognizer *vosk_recognizer_new(VoskModel *model, float sample_rate);


/** Creates the recognizer object with speaker recognition
 *
 *  With the speaker recognition mode the recognizer not just recognize
 *  text but also return speaker vectors one can use for speaker identification
 *
 *  @param model       VoskModel containing static data for recognizer. Model can be
 *                     shared across recognizers, even running in different threads.
 *  @param sample_rate The sample rate of the audio you going to feed into the recognizer.
 *                     Make sure this rate matches the audio content, it is a common
 *                     issue causing accuracy problems.
 *  @param spk_model speaker model for speaker identification
 *  @returns recognizer object or NULL if problem occured */
VoskRecognizer *vosk_recognizer_new_spk(VoskModel *model, float sample_rate, VoskSpkModel *spk_model);


/** Creates the recognizer object with the phrase list
 *
 *  Sometimes when you want to improve recognition accuracy and when you don't need
 *  to recognize large vocabulary you can specify a list of phrases to recognize. This
 *  will improve recognizer speed and accuracy but might return [unk] if user said
 *  something different.
 *
 *  Only recognizers with lookahead models support this type of quick configuration.
 *  Precompiled HCLG graph models are not supported.
 *
 *  @param model       VoskModel containing static data for recognizer. Model can be
 *                     shared across recognizers, even running in different threads.
 *  @param sample_rate The sample rate of the audio you going to feed into the recognizer.
 *                     Make sure this rate matches the audio content, it is a common
 *                     issue causing accuracy problems.
 *  @param grammar The string with the list of phrases to recognize as JSON array of strings,
 *                 for example "["one two three four five", "[unk]"]".
 *
 *  @returns recognizer object or NULL if problem occured */
VoskRecognizer *vosk_recognizer_new_grm(VoskModel *model, float sample_rate, const char *grammar);


/** Adds speaker model to already initialized recognizer
 *
 * Can add speaker recognition model to already created recognizer. Helps to initialize
 * speaker recognition for grammar-based recognizer.
 *
 * @param spk_model Speaker recognition model */
void vosk_recognizer_set_spk_model(VoskRecognizer *recognizer, VoskSpkModel *spk_model);


/** Configures recognizer to output n-best results
 *
 * <pre>
 *   {
 *      "alternatives": [
 *          { "text": "one two three four five", "confidence": 0.97 },
 *          { "text": "one two three for five", "confidence": 0.03 },
 *      ]
 *   }
 * </pre>
 *
 * @param max_alternatives - maximum alternatives to return from recognition results
 */
void vosk_recognizer_set_max_alternatives(VoskRecognizer *recognizer, int max_alternatives);


/** Enables words with times in the output
 *
 * <pre>
 *   "result" : [{
 *       "conf" : 1.000000,
 *       "end" : 1.110000,
 *       "start" : 0.870000,
 *       "word" : "what"
 *     }, {
 *       "conf" : 1.000000,
 *       "end" : 1.530000,
 *       "start" : 1.110000,
 *       "word" : "zero"
 *     }, {
 *       "conf" : 1.000000,
 *       "end" : 1.950000,
 *       "start" : 1.530000,
 *       "word" : "zero"
 *     }, {
 *       "conf" : 1.000000,
 *       "end" : 2.340000,
 *       "start" : 1.950000,
 *       "word" : "zero"
 *     }, {
 *       "conf" : 1.000000,
 *       "end" : 2.610000,
 *       "start" : 2.340000,
 *       "word" : "one"
 *     }],
 * </pre>
 *
 * @param words - boolean value
 */
void vosk_recognizer_set_words(VoskRecognizer *recognizer, int words);


/** Accept voice data
 *
 *  accept and process new chunk of voice data
 *
 *  @param data - audio data in PCM 16-bit mono format
 *  @param length - length of the audio data
 *  @returns 1 if silence is occured and you can retrieve a new utterance with result method 
 *           0 if decoding continues
 *           -1 if exception occured */
int vosk_recognizer_accept_waveform(VoskRecognizer *recognizer, const char *data, int length);


/** Same as above but the version with the short data for language bindings where you have
 *  audio as array of shorts */
int vosk_recognizer_accept_waveform_s(VoskRecognizer *recognizer, const short *data, int length);


/** Same as above but the version with the float data for language bindings where you have
 *  audio as array of floats */
int vosk_recognizer_accept_waveform_f(VoskRecognizer *recognizer, const float *data, int length);


/** Returns speech recognition result
 *
 * @returns the result in JSON format which contains decoded line, decoded
 *          words, times in seconds and confidences. You can parse this result
 *          with any json parser
 *
 * <pre>
 *  {
 *    "text" : "what zero zero zero one"
 *  }
 * </pre>
 *
 * If alternatives enabled it returns result with alternatives, see also vosk_recognizer_set_alternatives().
 *
 * If word times enabled returns word time, see also vosk_recognizer_set_word_times().
 */
const char *vosk_recognizer_result(VoskRecognizer *recognizer);


/** Returns partial speech recognition
 *
 * @returns partial speech recognition text which is not yet finalized.
 *          result may change as recognizer process more data.
 *
 * <pre>
 * {
 *    "partial" : "cyril one eight zero"
 * }
 * </pre>
 */
const char *vosk_recognizer_partial_result(VoskRecognizer *recognizer);


/** Returns speech recognition result. Same as result, but doesn't wait for silence
 *  You usually call it in the end of the stream to get final bits of audio. It
 *  flushes the feature pipeline, so all remaining audio chunks got processed.
 *
 *  @returns speech result in JSON format.
 */
const char *vosk_recognizer_final_result(VoskRecognizer *recognizer);


/** Resets the recognizer
 *
 *  Resets current results so the recognition can continue from scratch */
void vosk_recognizer_reset(VoskRecognizer *recognizer);


/** Releases recognizer object
 *
 *  Underlying model is also unreferenced and if needed released */
void vosk_recognizer_free(VoskRecognizer *recognizer);

/** Set log level for Kaldi messages
 *
 *  @param log_level the level
 *     0 - default value to print info and error messages but no debug
 *     less than 0 - don't print info messages
 *     greather than 0 - more verbose mode
 */
void vosk_set_log_level(int log_level);

/**
 *  Init, automatically select a CUDA device and allow multithreading.
 *  Must be called once from the main thread.
 *  Has no effect if HAVE_CUDA flag is not set.
 */
void vosk_gpu_init();

/**
 *  Init CUDA device in a multi-threaded environment.
 *  Must be called for each thread.
 *  Has no effect if HAVE_CUDA flag is not set.
 */
void vosk_gpu_thread_init();

#ifdef __cplusplus
}
#endif

#endif /* VOSK_API_H */
