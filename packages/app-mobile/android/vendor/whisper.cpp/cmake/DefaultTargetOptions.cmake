# Set the default compile features and properties for a target.

if (NOT TARGET)
    message(FATAL_ERROR "TARGET not set before including DefaultTargetOptions")
endif()

target_compile_features(${TARGET}
    PRIVATE
        cxx_std_11
    )

set_target_properties(${TARGET}
    PROPERTIES
        EXPORT_COMPILE_COMMANDS ON
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
