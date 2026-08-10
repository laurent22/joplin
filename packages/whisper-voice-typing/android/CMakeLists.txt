cmake_minimum_required(VERSION 3.9.0)
project(WhisperVoiceTyping)

set(PACKAGE_NAME WhisperVoiceTyping)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Define C++ library and add all sources
add_library(
        ${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        ../cpp/utils/testing.cpp
        ../cpp/utils/findLongestSilence_test.cpp
        ../cpp/utils/findLongestSilence.cpp
        ../cpp/utils/WhisperSession.cpp
        ../cpp/utils/SingleThread.cpp
        ../cpp/utils/SingleThread_test.cpp
        ../cpp/HybridWhisperSession.cpp
        ../cpp/HybridWhisperVoiceTyping.cpp
)

# Add Nitrogen specs :)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/WhisperVoiceTyping+autolinking.cmake)

# Set up local includes
include_directories("src/main/cpp" "../cpp" "../cpp/utils")

################################
# Whisper.cpp configuration    #
################################

set(WHISPER_LIB_DIR ${CMAKE_SOURCE_DIR}/../vendor/whisper.cpp)

# Based on the Whisper.cpp Android example:
set(SHARED_FLAGS "-O3 ")
set(CMAKE_C_FLAGS   "${CMAKE_C_FLAGS}   ${SHARED_FLAGS} ")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${SHARED_FLAGS} -fvisibility=hidden -fvisibility-inlines-hidden -ffunction-sections -fdata-sections")

# Whisper: See https://stackoverflow.com/a/76290722
add_subdirectory(${WHISPER_LIB_DIR} ./whisper)

include_directories(${WHISPER_LIB_DIR}/include)

#################################
# END Whisper.cpp configuration #
#################################

find_library(LOG_LIB log)

# Link all libraries together
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        whisper
        android # <-- Android core
)
