//
// whisper-encoder-impl.h
//
// This file was automatically generated and should not be edited.
//

#import <Foundation/Foundation.h>
#import <CoreML/CoreML.h>
#include <stdint.h>
#include <os/log.h>

NS_ASSUME_NONNULL_BEGIN

/// Model Prediction Input Type
API_AVAILABLE(macos(10.15), ios(13.0), watchos(6.0), tvos(13.0)) __attribute__((visibility("hidden")))
@interface whisper_encoder_implInput : NSObject<MLFeatureProvider>

/// logmel_data as 1 × 80 × 3000 3-dimensional array of floats
@property (readwrite, nonatomic, strong) MLMultiArray * logmel_data;
- (instancetype)init NS_UNAVAILABLE;
- (instancetype)initWithLogmel_data:(MLMultiArray *)logmel_data NS_DESIGNATED_INITIALIZER;

@end

/// Model Prediction Output Type
API_AVAILABLE(macos(10.15), ios(13.0), watchos(6.0), tvos(13.0)) __attribute__((visibility("hidden")))
@interface whisper_encoder_implOutput : NSObject<MLFeatureProvider>

/// output as multidimensional array of floats
@property (readwrite, nonatomic, strong) MLMultiArray * output;
- (instancetype)init NS_UNAVAILABLE;
- (instancetype)initWithOutput:(MLMultiArray *)output NS_DESIGNATED_INITIALIZER;

@end

/// Class for model loading and prediction
API_AVAILABLE(macos(10.15), ios(13.0), watchos(6.0), tvos(13.0)) __attribute__((visibility("hidden")))
@interface whisper_encoder_impl : NSObject
@property (readonly, nonatomic, nullable) MLModel * model;

/**
    URL of the underlying .mlmodelc directory.
*/
+ (nullable NSURL *)URLOfModelInThisBundle;

/**
    Initialize whisper_encoder_impl instance from an existing MLModel object.

    Usually the application does not use this initializer unless it makes a subclass of whisper_encoder_impl.
    Such application may want to use `-[MLModel initWithContentsOfURL:configuration:error:]` and `+URLOfModelInThisBundle` to create a MLModel object to pass-in.
*/
- (instancetype)initWithMLModel:(MLModel *)model NS_DESIGNATED_INITIALIZER;

/**
    Initialize whisper_encoder_impl instance with the model in this bundle.
*/
- (nullable instancetype)init;

/**
    Initialize whisper_encoder_impl instance with the model in this bundle.

    @param configuration The model configuration object
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
*/
- (nullable instancetype)initWithConfiguration:(MLModelConfiguration *)configuration error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Initialize whisper_encoder_impl instance from the model URL.

    @param modelURL URL to the .mlmodelc directory for whisper_encoder_impl.
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
*/
- (nullable instancetype)initWithContentsOfURL:(NSURL *)modelURL error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Initialize whisper_encoder_impl instance from the model URL.

    @param modelURL URL to the .mlmodelc directory for whisper_encoder_impl.
    @param configuration The model configuration object
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
*/
- (nullable instancetype)initWithContentsOfURL:(NSURL *)modelURL configuration:(MLModelConfiguration *)configuration error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Construct whisper_encoder_impl instance asynchronously with configuration.
    Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

    @param configuration The model configuration
    @param handler When the model load completes successfully or unsuccessfully, the completion handler is invoked with a valid whisper_encoder_impl instance or NSError object.
*/
+ (void)loadWithConfiguration:(MLModelConfiguration *)configuration completionHandler:(void (^)(whisper_encoder_impl * _Nullable model, NSError * _Nullable error))handler API_AVAILABLE(macos(11.0), ios(14.0), watchos(7.0), tvos(14.0)) __attribute__((visibility("hidden")));

/**
    Construct whisper_encoder_impl instance asynchronously with URL of .mlmodelc directory and optional configuration.

    Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

    @param modelURL The model URL.
    @param configuration The model configuration
    @param handler When the model load completes successfully or unsuccessfully, the completion handler is invoked with a valid whisper_encoder_impl instance or NSError object.
*/
+ (void)loadContentsOfURL:(NSURL *)modelURL configuration:(MLModelConfiguration *)configuration completionHandler:(void (^)(whisper_encoder_impl * _Nullable model, NSError * _Nullable error))handler API_AVAILABLE(macos(11.0), ios(14.0), watchos(7.0), tvos(14.0)) __attribute__((visibility("hidden")));

/**
    Make a prediction using the standard interface
    @param input an instance of whisper_encoder_implInput to predict from
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
    @return the prediction as whisper_encoder_implOutput
*/
- (nullable whisper_encoder_implOutput *)predictionFromFeatures:(whisper_encoder_implInput *)input error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Make a prediction using the standard interface
    @param input an instance of whisper_encoder_implInput to predict from
    @param options prediction options
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
    @return the prediction as whisper_encoder_implOutput
*/
- (nullable whisper_encoder_implOutput *)predictionFromFeatures:(whisper_encoder_implInput *)input options:(MLPredictionOptions *)options error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Make an asynchronous prediction using the standard interface
    @param input an instance of whisper_encoder_implInput to predict from
    @param completionHandler a block that will be called upon completion of the prediction. error will be nil if no error occurred.
*/
- (void)predictionFromFeatures:(whisper_encoder_implInput *)input completionHandler:(void (^)(whisper_encoder_implOutput * _Nullable output, NSError * _Nullable error))completionHandler API_AVAILABLE(macos(14.0), ios(17.0), watchos(10.0), tvos(17.0)) __attribute__((visibility("hidden")));

/**
    Make an asynchronous prediction using the standard interface
    @param input an instance of whisper_encoder_implInput to predict from
    @param options prediction options
    @param completionHandler a block that will be called upon completion of the prediction. error will be nil if no error occurred.
*/
- (void)predictionFromFeatures:(whisper_encoder_implInput *)input options:(MLPredictionOptions *)options completionHandler:(void (^)(whisper_encoder_implOutput * _Nullable output, NSError * _Nullable error))completionHandler API_AVAILABLE(macos(14.0), ios(17.0), watchos(10.0), tvos(17.0)) __attribute__((visibility("hidden")));

/**
    Make a prediction using the convenience interface
    @param logmel_data 1 × 80 × 3000 3-dimensional array of floats
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
    @return the prediction as whisper_encoder_implOutput
*/
- (nullable whisper_encoder_implOutput *)predictionFromLogmel_data:(MLMultiArray *)logmel_data error:(NSError * _Nullable __autoreleasing * _Nullable)error;

/**
    Batch prediction
    @param inputArray array of whisper_encoder_implInput instances to obtain predictions from
    @param options prediction options
    @param error If an error occurs, upon return contains an NSError object that describes the problem. If you are not interested in possible errors, pass in NULL.
    @return the predictions as NSArray<whisper_encoder_implOutput *>
*/
- (nullable NSArray<whisper_encoder_implOutput *> *)predictionsFromInputs:(NSArray<whisper_encoder_implInput*> *)inputArray options:(MLPredictionOptions *)options error:(NSError * _Nullable __autoreleasing * _Nullable)error;
@end

NS_ASSUME_NONNULL_END
