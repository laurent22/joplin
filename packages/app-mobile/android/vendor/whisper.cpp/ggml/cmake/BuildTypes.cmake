# Add new build types

# ReleaseGG - Release with enabled asserts

SET(CMAKE_CXX_FLAGS_RELEASEGG
    "-O3"
    CACHE STRING "Flags used by the c++ compiler during release builds with enabled asserts."
    FORCE )
SET(CMAKE_C_FLAGS_RELEASEGG
    "-O3"
    CACHE STRING "Flags used by the compiler during release builds with enabled asserts."
    FORCE )
SET(CMAKE_EXE_LINKER_FLAGS_RELEASEGG
    ""
    CACHE STRING "Flags used for linking binaries during release builds with enabled asserts."
    FORCE )
SET(CMAKE_SHARED_LINKER_FLAGS_RELEASEGG
    ""
    CACHE STRING "Flags used by the shared libraries linker during release builds with enabled asserts."
    FORCE )
MARK_AS_ADVANCED(
    CMAKE_CXX_FLAGS_RELEASEGG
    CMAKE_C_FLAGS_RELEASEGG
    CMAKE_EXE_LINKER_FLAGS_RELEASEGG
    CMAKE_SHARED_LINKER_FLAGS_RELEASEGG )

# RelWithDebInfoGG - RelWithDebInfo with enabled asserts

SET(CMAKE_CXX_FLAGS_RELWITHDEBINFOGG
    "-O2 -g"
    CACHE STRING "Flags used by the c++ compiler during release builds with debug symbols and enabled asserts."
    FORCE )
SET(CMAKE_C_FLAGS_RELWITHDEBINFOGG
    "-O2 -g"
    CACHE STRING "Flags used by the compiler during release builds with debug symbols and enabled asserts."
    FORCE )
SET(CMAKE_EXE_LINKER_FLAGS_RELWITHDEBINFOGG
    ""
    CACHE STRING "Flags used for linking binaries during release builds with debug symbols and enabled asserts."
    FORCE )
SET(CMAKE_SHARED_LINKER_FLAGS_RELWITHDEBINFOGG
    ""
    CACHE STRING "Flags used by the shared libraries linker during release builds with debug symbols and enabled asserts."
    FORCE )
MARK_AS_ADVANCED(
    CMAKE_CXX_FLAGS_RELWITHDEBINFOGG
    CMAKE_C_FLAGS_RELWITHDEBINFOGG
    CMAKE_EXE_LINKER_FLAGS_RELWITHDEBINFOGG
    CMAKE_SHARED_LINKER_FLAGS_RELWITHDEBINFOGG )

if (NOT XCODE AND NOT MSVC AND NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo" "ReleaseGG" "RelWithDebInfoGG")
endif()
