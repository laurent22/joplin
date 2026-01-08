
# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html.
# For more examples on how to use CMake, see https://github.com/android/ndk-samples.

cmake_minimum_required(VERSION 3.22.1)

project("joplin")

# Required by React Native. See https://reactnative.dev/docs/0.81/the-new-architecture/pure-cxx-modules.
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

set(SHARED_SOURCES_DIR "../../../../../shared")

target_sources(${CMAKE_PROJECT_NAME} PRIVATE
	${SHARED_SOURCES_DIR}/NativeWhisperModule.cpp
	${SHARED_SOURCES_DIR}/utils/WhisperSession.cpp
    ${SHARED_SOURCES_DIR}/utils/findLongestSilence.cpp
    ${SHARED_SOURCES_DIR}/utils/findLongestSilence_test.cpp
)

set(WHISPER_LIB_DIR ${SHARED_SOURCES_DIR}/vendor/whisper.cpp)

# Based on the Whisper.cpp Android example:
set(SHARED_FLAGS "-O3 ")
set(CMAKE_C_FLAGS   "${CMAKE_C_FLAGS}   ${SHARED_FLAGS} ")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${SHARED_FLAGS} -fvisibility=hidden -fvisibility-inlines-hidden -ffunction-sections -fdata-sections")

# Whisper: See https://stackoverflow.com/a/76290722
add_subdirectory(${WHISPER_LIB_DIR} ./whisper)

# Directories for header files
target_include_directories(
	${CMAKE_PROJECT_NAME}
	PUBLIC
    ${SHARED_SOURCES_DIR}
	${WHISPER_LIB_DIR}/include
)

target_link_libraries(${CMAKE_PROJECT_NAME}
    whisper
    android
    log
)
