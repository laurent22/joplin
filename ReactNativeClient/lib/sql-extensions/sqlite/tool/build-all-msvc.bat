@ECHO OFF

::
:: build-all-msvc.bat --
::
:: Multi-Platform Build Tool for MSVC
::

REM
REM This batch script is used to build the SQLite DLL for multiple platforms
REM and configurations using MSVC.  The built SQLite DLLs, their associated
REM import libraries, and optionally their symbols files, are placed within
REM the directory specified on the command line, in sub-directories named for
REM their respective platforms and configurations.  This batch script must be
REM run from inside a Visual Studio Command Prompt for the desired version of
REM Visual Studio ^(the initial platform configured for the command prompt does
REM not really matter^).  Exactly one command line argument is required, the
REM name of an existing directory to be used as the final destination directory
REM for the generated output files, which will be placed in sub-directories
REM created therein.  Ideally, the directory specified should be empty.
REM
REM Example:
REM
REM                        CD /D C:\dev\sqlite\core
REM                        CALL tool\build-all-msvc.bat C:\Temp
REM
REM In the example above, "C:\dev\sqlite\core" represents the root of the
REM source tree for SQLite and "C:\Temp" represents the final destination
REM directory for the generated output files.
REM
REM Please note that the SQLite build process performed by the Makefile
REM associated with this batch script requires a Tcl shell to be present
REM in a directory contained in the PATH environment variable unless a
REM pre-existing amalgamation file is used.
REM
REM There are several environment variables that may be set to modify the
REM behavior of this batch script and its associated Makefile.  The list of
REM platforms to build may be overriden by using the PLATFORMS environment
REM variable, which should contain a list of platforms ^(e.g. x86 x86_amd64
REM x86_arm^).  All platforms must be supported by the version of Visual Studio
REM being used.  The list of configurations to build may be overridden by
REM setting the CONFIGURATIONS environment variable, which should contain a
REM list of configurations to build ^(e.g. Debug Retail^).  Neither of these
REM variable values may contain any double quotes, surrounding or embedded.
REM
REM Finally, the NCRTLIBPATH, NUCRTLIBPATH, and NSDKLIBPATH environment
REM variables may be set to specify the location of the CRT, Universal CRT, and
REM Windows SDK, respectively, that may be needed to compile executables native
REM to the architecture of the build machine during any cross-compilation that
REM may be necessary, depending on the platforms to be built.  These values in
REM these three variables should be surrounded by double quotes if they contain
REM spaces.
REM
REM There are a few other environment variables that impact the build process
REM when set ^(to anything^), they are:
REM
REM                        USE_AUTOCONF_MAKEFILE
REM
REM When set, the "autoconf" Makefile for MSVC will be used instead of the main
REM Makefile for MSVC.  It must exist at "%ROOT%\autoconf\Makefile.msc".
REM
REM                        NOCLEAN
REM
REM When set, the "clean" target will not be used during each build iteration.
REM However, the target binaries, if any, will still be deleted manually prior
REM to being rebuilt.  Setting this environment variable is only rarely needed
REM and could cause issues in some circumstances; therefore, setting it is not
REM recommended.
REM
REM                        NOSYMBOLS
REM
REM When set, copying of symbol files ^(*.pdb^) created during the build will
REM be skipped and they will not appear in the final destination directory.
REM Setting this environment variable is never strictly needed and could cause
REM issues in some circumstances; therefore, setting it is not recommended.
REM
REM                        NOMEMDEBUG
REM
REM When set, disables use of MEMDEBUG when building binaries for the "Debug"
REM configuration.
REM
REM                        BUILD_ALL_SHELL
REM
REM When set, the command line shell will be built for each selected platform
REM and configuration as well.  In addition, the command line shell binaries
REM will be copied, with their symbols, to the final destination directory.
REM
REM                        USE_WINV63_NSDKLIBPATH
REM
REM When set, modifies how the NSDKLIBPATH environment variable is built, based
REM on the WindowsSdkDir environment variable.  It forces this batch script to
REM assume the Windows 8.1 SDK location should be used.
REM
REM                        USE_WINV100_NSDKLIBPATH
REM
REM When set, modifies how the NSDKLIBPATH environment variable is built, based
REM on the WindowsSdkDir environment variable.  It causes this batch script to
REM assume the Windows 10.0 SDK location should be used.
REM
REM                        NMAKE_ARGS
REM                        NMAKE_ARGS_DEBUG
REM                        NMAKE_ARGS_RETAIL
REM
REM When set, these values are expanded and passed to the NMAKE command line,
REM after its other arguments.  These may be used to specify additional NMAKE
REM options, for example:
REM
REM                        SET NMAKE_ARGS=FOR_WINRT=1
REM                        SET NMAKE_ARGS_DEBUG=MEMDEBUG=1
REM                        SET NMAKE_ARGS_RETAIL=WIN32HEAP=1
REM
REM Using the above command before running this tool will cause the compiled
REM binaries to target the WinRT environment, which provides a subset of the
REM Win32 API.
REM
REM                        DLL_FILE_NAME
REM                        DLL_PDB_FILE_NAME
REM                        LIB_FILE_NAME
REM                        EXE_FILE_NAME
REM                        EXE_PDB_FILE_NAME
REM
REM When set, these values will override the associated target file name used
REM for the build.
REM
SETLOCAL

REM SET __ECHO=ECHO
REM SET __ECHO2=ECHO
REM SET __ECHO3=ECHO
IF NOT DEFINED _AECHO (SET _AECHO=REM)
IF NOT DEFINED _CECHO (SET _CECHO=REM)
IF NOT DEFINED _VECHO (SET _VECHO=REM)

SET REDIRECT=^>
IF DEFINED __ECHO SET REDIRECT=^^^>

%_AECHO% Running %0 %*

REM SET DFLAGS=/L

%_VECHO% DFlags = '%DFLAGS%'

SET FFLAGS=/V /F /G /H /I /R /Y /Z

%_VECHO% FFlags = '%FFLAGS%'

SET ROOT=%~dp0\..
SET ROOT=%ROOT:\\=\%

%_VECHO% Root = '%ROOT%'

REM
REM NOTE: The first and only argument to this batch file should be the output
REM       directory where the platform-specific binary directories should be
REM       created.
REM
SET BINARYDIRECTORY=%1

IF NOT DEFINED BINARYDIRECTORY (
  GOTO usage
)

%_VECHO% BinaryDirectory = '%BINARYDIRECTORY%'

SET DUMMY=%2

IF DEFINED DUMMY (
  GOTO usage
)

REM
REM NOTE: From this point, we need a clean error level.  Reset it now.
REM
CALL :fn_ResetErrorLevel

REM
REM NOTE: Change the current directory to the root of the source tree, saving
REM       the current directory on the directory stack.
REM
%__ECHO2% PUSHD "%ROOT%"

IF ERRORLEVEL 1 (
  ECHO Could not change directory to "%ROOT%".
  GOTO errors
)

REM
REM NOTE: This batch file requires the ComSpec environment variable to be set,
REM       typically to something like "C:\Windows\System32\cmd.exe".
REM
IF NOT DEFINED ComSpec (
  ECHO The ComSpec environment variable must be defined.
  GOTO errors
)

REM
REM NOTE: This batch file requires the VcInstallDir environment variable to be
REM       set.  Tyipcally, this means this batch file needs to be run from an
REM       MSVC command prompt.
REM
IF NOT DEFINED VCINSTALLDIR (
  ECHO The VCINSTALLDIR environment variable must be defined.
  GOTO errors
)

REM
REM NOTE: If the list of platforms is not already set, use the default list.
REM
IF NOT DEFINED PLATFORMS (
  SET PLATFORMS=x86 x86_amd64 x86_arm
)

%_VECHO% Platforms = '%PLATFORMS%'

REM
REM NOTE: If the list of configurations is not already set, use the default
REM       list.
REM
IF NOT DEFINED CONFIGURATIONS (
  SET CONFIGURATIONS=Debug Retail
)

%_VECHO% Configurations = '%CONFIGURATIONS%'

REM
REM NOTE: If the command used to invoke NMAKE is not already set, use the
REM       default.
REM
IF NOT DEFINED NMAKE_CMD (
  IF DEFINED USE_AUTOCONF_MAKEFILE (
    SET NMAKE_CMD=nmake -B -f autoconf\Makefile.msc
  ) ELSE (
    SET NMAKE_CMD=nmake -B -f Makefile.msc
  )
)

%_VECHO% NmakeCmd = '%NMAKE_CMD%'
%_VECHO% NmakeArgs = '%NMAKE_ARGS%'
%_VECHO% NmakeArgsDebug = '%NMAKE_ARGS_DEBUG%'
%_VECHO% NmakeArgsRetail = '%NMAKE_ARGS_RETAIL%'

REM
REM NOTE: Setup environment variables to translate between the MSVC platform
REM       names and the names to be used for the platform-specific binary
REM       directories.
REM
SET amd64_NAME=x64
SET arm_NAME=ARM
SET x64_NAME=x64
SET x86_NAME=x86
SET x86_amd64_NAME=x64
SET x86_arm_NAME=ARM
SET x86_x64_NAME=x64

%_VECHO% amd64_Name = '%amd64_NAME%'
%_VECHO% arm_Name = '%arm_NAME%'
%_VECHO% x64_Name = '%x64_NAME%'
%_VECHO% x86_Name = '%x86_NAME%'
%_VECHO% x86_amd64_Name = '%x86_amd64_NAME%'
%_VECHO% x86_arm_Name = '%x86_arm_NAME%'
%_VECHO% x86_x64_Name = '%x86_x64_NAME%'

REM
REM NOTE: Check for the external tools needed during the build process ^(i.e.
REM       those that do not get compiled as part of the build process itself^)
REM       along the PATH.
REM
IF DEFINED TCLSH_CMD (
  SET TCLSH_FILE=%TCLSH_CMD%
) ELSE (
  SET TCLSH_FILE=tclsh.exe
)

FOR %%T IN (%TCLSH_FILE%) DO (
  SET %%T_PATH=%%~dp$PATH:T
)

REM
REM NOTE: A Tcl shell executable is required during the SQLite build process
REM       unless a pre-existing amalgamation file is used.
REM
IF NOT DEFINED %TCLSH_FILE%_PATH (
  ECHO The Tcl shell executable "%TCLSH_FILE%" is required to be in the PATH.
  GOTO errors
)

REM
REM NOTE: Setup the default names for the build targets we are creating.  Any
REM       ^(or all^) of these may end up being overridden.
REM
IF NOT DEFINED DLL_FILE_NAME (
  SET DLL_FILE_NAME=sqlite3.dll
)

IF NOT DEFINED DLL_PDB_FILE_NAME (
  SET DLL_PDB_FILE_NAME=sqlite3.pdb
)

IF NOT DEFINED LIB_FILE_NAME (
  SET LIB_FILE_NAME=sqlite3.lib
)

IF NOT DEFINED EXE_FILE_NAME (
  SET EXE_FILE_NAME=sqlite3.exe
)

IF NOT DEFINED EXE_PDB_FILE_NAME (
  SET EXE_PDB_FILE_NAME=sqlite3sh.pdb
)

REM
REM NOTE: Set the TOOLPATH variable to contain all the directories where the
REM       external tools were found in the search above.
REM
CALL :fn_CopyVariable %TCLSH_FILE%_PATH TOOLPATH

%_VECHO% ToolPath = '%TOOLPATH%'

REM
REM NOTE: Setting the Windows SDK library path is only required for MSVC
REM       2012, 2013, and 2015.
REM
CALL :fn_UnsetVariable SET_NSDKLIBPATH

REM
REM NOTE: Setting the Universal CRT library path is only required for MSVC
REM       2015.
REM
CALL :fn_UnsetVariable SET_NUCRTLIBPATH

REM
REM NOTE: Check for MSVC 2012, 2013, and 2015 specially because the Windows
REM       SDK directory handling is slightly different for those versions.
REM
IF "%VisualStudioVersion%" == "11.0" (
  REM
  REM NOTE: If the Windows SDK library path has already been set, do not set
  REM       it to something else later on.
  REM
  IF NOT DEFINED NSDKLIBPATH (
    SET SET_NSDKLIBPATH=1
  )
) ELSE IF "%VisualStudioVersion%" == "12.0" (
  REM
  REM NOTE: If the Windows SDK library path has already been set, do not set
  REM       it to something else later on.
  REM
  IF NOT DEFINED NSDKLIBPATH (
    SET SET_NSDKLIBPATH=1
  )
) ELSE IF "%VisualStudioVersion%" == "14.0" (
  REM
  REM NOTE: If the Windows SDK library path has already been set, do not set
  REM       it to something else later on.
  REM
  IF NOT DEFINED NSDKLIBPATH (
    SET SET_NSDKLIBPATH=1
  )

  REM
  REM NOTE: If the Universal CRT library path has already been set, do not set
  REM       it to something else later on.
  REM
  IF NOT DEFINED NUCRTLIBPATH (
    SET SET_NUCRTLIBPATH=1
  )
)

REM
REM NOTE: This is the name of the sub-directory where the UCRT libraries may
REM       be found.  It is only used when compiling against the UCRT.
REM
IF DEFINED UCRTVersion (
  SET NUCRTVER=%UCRTVersion%
) ELSE (
  SET NUCRTVER=10.0.10586.0
)

REM
REM NOTE: This is the name of the sub-directory where the Windows 10.0 SDK
REM       libraries may be found.  It is only used when compiling with the
REM       Windows 10.0 SDK.
REM
IF DEFINED WindowsSDKLibVersion (
  SET WIN10SDKVER=%WindowsSDKLibVersion:\=%
) ELSE (
  SET WIN10SDKVER=%NUCRTVER%
)

REM
REM NOTE: Check if this is the Windows Phone SDK.  If so, a different batch
REM       file is necessary to setup the build environment.  Since the variable
REM       values involved here may contain parenthesis, using GOTO instead of
REM       an IF block is required.
REM
IF DEFINED WindowsPhoneKitDir GOTO set_vcvarsall_phone
SET VCVARSALL=%VCINSTALLDIR%\vcvarsall.bat
GOTO set_vcvarsall_done
:set_vcvarsall_phone
SET VCVARSALL=%VCINSTALLDIR%\WPSDK\WP80\vcvarsphoneall.bat
:set_vcvarsall_done
SET VCVARSALL=%VCVARSALL:\\=\%

REM
REM NOTE: This is the outer loop.  There should be exactly one iteration per
REM       platform.
REM
FOR %%P IN (%PLATFORMS%) DO (
  REM
  REM NOTE: Using the MSVC platform name, lookup the simpler platform name to
  REM       be used for the name of the platform-specific binary directory via
  REM       the environment variables setup earlier.
  REM
  CALL :fn_CopyVariable %%P_NAME PLATFORMNAME

  REM
  REM NOTE: This is the second loop.  There should be exactly one iteration.
  REM       This loop is necessary because the PlatformName environment
  REM       variable was set above and that value is needed by some of the
  REM       commands contained in the inner loop.  If these commands were
  REM       directly contained in the outer loop, the PlatformName environment
  REM       variable would be stuck with its initial empty value instead.
  REM
  FOR /F "tokens=2* delims==" %%D IN ('SET PLATFORMNAME') DO (
    REM
    REM NOTE: Attempt to clean the environment of all variables used by MSVC
    REM       and/or Visual Studio.  This block may need to be updated in the
    REM       future to account for additional environment variables.
    REM
    CALL :fn_UnsetVariable CommandPromptType
    CALL :fn_UnsetVariable DevEnvDir
    CALL :fn_UnsetVariable DNX_HOME
    CALL :fn_UnsetVariable ExtensionSdkDir
    CALL :fn_UnsetVariable Framework35Version
    CALL :fn_UnsetVariable Framework40Version
    CALL :fn_UnsetVariable FrameworkDir
    CALL :fn_UnsetVariable FrameworkDir32
    CALL :fn_UnsetVariable FrameworkVersion
    CALL :fn_UnsetVariable FrameworkVersion32
    CALL :fn_UnsetVariable FSHARPINSTALLDIR
    CALL :fn_UnsetVariable INCLUDE
    CALL :fn_UnsetVariable LIB
    CALL :fn_UnsetVariable LIBPATH
    CALL :fn_UnsetVariable NETFXSDKDir
    CALL :fn_UnsetVariable Platform
    CALL :fn_UnsetVariable UCRTVersion
    CALL :fn_UnsetVariable UniversalCRTSdkDir
    REM CALL :fn_UnsetVariable VCINSTALLDIR
    CALL :fn_UnsetVariable VSINSTALLDIR
    CALL :fn_UnsetVariable WindowsLibPath
    CALL :fn_UnsetVariable WindowsPhoneKitDir
    CALL :fn_UnsetVariable WindowsSdkDir
    CALL :fn_UnsetVariable WindowsSdkDir_35
    CALL :fn_UnsetVariable WindowsSdkDir_old
    CALL :fn_UnsetVariable WindowsSDKLibVersion
    CALL :fn_UnsetVariable WindowsSDKVersion
    CALL :fn_UnsetVariable WindowsSDK_ExecutablePath_x86
    CALL :fn_UnsetVariable WindowsSDK_ExecutablePath_x64

    REM
    REM NOTE: Reset the PATH here to the absolute bare minimum required.
    REM
    CALL :fn_ResetPath

    REM
    REM NOTE: This is the inner loop.  There are normally two iterations, one
    REM       for each supported build configuration, e.g. Debug or Retail.
    REM
    FOR %%B IN (%CONFIGURATIONS%) DO (
      REM
      REM NOTE: When preparing the debug build, set the DEBUG and MEMDEBUG
      REM       environment variables to be picked up by the MSVC makefile
      REM       itself.
      REM
      %_AECHO% Building the %%B configuration for platform %%P with name %%D...

      IF /I "%%B" == "Debug" (
        REM
        REM NOTE: Using this level for the DEBUG environment variable should
        REM       disable all compiler optimizations and prevent use of the
        REM       NDEBUG define.  Additionally, both SQLITE_ENABLE_API_ARMOR
        REM       and SQLITE_DEBUG defines should be enabled.
        REM
        SET DEBUG=3

        REM
        REM NOTE: Setting this to non-zero should enable the SQLITE_MEMDEBUG
        REM       define.
        REM
        IF NOT DEFINED NOMEMDEBUG (
          SET MEMDEBUG=1
        )
      ) ELSE (
        CALL :fn_UnsetVariable DEBUG
        CALL :fn_UnsetVariable MEMDEBUG
      )

      REM
      REM NOTE: Copy the extra NMAKE arguments for this configuration into the
      REM       common variable used by the actual commands.
      REM
      CALL :fn_CopyVariable NMAKE_ARGS_%%B NMAKE_ARGS_CFG

      REM
      REM NOTE: Launch a nested command shell to perform the following steps:
      REM
      REM       1. Setup the MSVC environment for this platform using the
      REM          official batch file.
      REM
      REM       2. Make sure that no stale build output files are present.
      REM
      REM       3. Build the "sqlite3.dll" and "sqlite3.lib" binaries for this
      REM          platform.
      REM
      REM       4. Copy the "sqlite3.dll" and "sqlite3.lib" binaries for this
      REM          platform to the platform-specific directory beneath the
      REM          binary directory.
      REM
      REM       5. Unless prevented from doing so, copy the "sqlite3.pdb"
      REM          symbols file for this platform to the platform-specific
      REM          directory beneath the binary directory.
      REM
      "%ComSpec%" /C (
        REM
        REM NOTE: Attempt to setup the MSVC environment for this platform.
        REM
        %__ECHO3% CALL "%VCVARSALL%" %%P

        IF ERRORLEVEL 1 (
          ECHO Failed to call "%VCVARSALL%" for platform %%P.
          GOTO errors
        )

        REM
        REM NOTE: If this batch file is not running in "what-if" mode, check to
        REM       be sure we were actually able to setup the MSVC environment
        REM       as current versions of their official batch file do not set
        REM       the exit code upon failure.
        REM
        IF NOT DEFINED __ECHO3 (
          IF NOT DEFINED WindowsPhoneKitDir (
            IF NOT DEFINED WindowsSdkDir (
              ECHO Cannot build, Windows SDK not found for platform %%P.
              GOTO errors
            )
          )
        )

        REM
        REM NOTE: When using MSVC 2012, 2013, or 2015, the native SDK path
        REM       cannot simply be the "lib" sub-directory beneath the location
        REM       specified in the WindowsSdkDir environment variable because
        REM       that location does not actually contain the necessary library
        REM       files for x86.  This must be done for each iteration because
        REM       it relies upon the WindowsSdkDir environment variable being
        REM       set by the batch file used to setup the MSVC environment.
        REM
        IF DEFINED SET_NSDKLIBPATH (
          REM
          REM NOTE: The Windows Phone SDK has a slightly different directory
          REM       structure and must be handled specially here.
          REM
          IF DEFINED WindowsPhoneKitDir (
            CALL :fn_CopyVariable WindowsPhoneKitDir NSDKLIBPATH
            CALL :fn_AppendVariable NSDKLIBPATH \lib\x86
          ) ELSE IF DEFINED WindowsSdkDir (
            CALL :fn_CopyVariable WindowsSdkDir NSDKLIBPATH

            REM
            REM NOTE: The Windows 8.x and Windows 10.0 SDKs have a slightly
            REM       different directory naming conventions.
            REM
            IF DEFINED USE_WINV100_NSDKLIBPATH (
              CALL :fn_AppendVariable NSDKLIBPATH \..\10\lib\%WIN10SDKVER%\um\x86
              CALL :fn_CopyVariable WindowsSdkDir PSDKLIBPATH
              CALL :fn_AppendVariable PSDKLIBPATH lib\%WIN10SDKVER%\um\%%D
            ) ELSE IF DEFINED USE_WINV63_NSDKLIBPATH (
              CALL :fn_AppendVariable NSDKLIBPATH \lib\winv6.3\um\x86
            ) ELSE IF "%VisualStudioVersion%" == "12.0" (
              CALL :fn_AppendVariable NSDKLIBPATH \..\8.0\lib\win8\um\x86
            ) ELSE IF "%VisualStudioVersion%" == "14.0" (
              CALL :fn_AppendVariable NSDKLIBPATH \..\8.0\lib\win8\um\x86
            ) ELSE (
              CALL :fn_AppendVariable NSDKLIBPATH \lib\win8\um\x86
            )
          )
        )

        REM
        REM NOTE: When using MSVC 2015, setting the Universal CRT library path
        REM       for x86 may be required as well.  This must also be done for
        REM       each iteration because it relies upon the UniversalCRTSdkDir
        REM       environment variable being set by the batch file used to
        REM       setup the MSVC environment.
        REM
        IF DEFINED SET_NUCRTLIBPATH (
          IF DEFINED UniversalCRTSdkDir (
            CALL :fn_CopyVariable UniversalCRTSdkDir NUCRTLIBPATH
            CALL :fn_AppendVariable NUCRTLIBPATH \lib\%NUCRTVER%\ucrt\x86
          )
        )

        REM
        REM NOTE: Unless prevented from doing so, invoke NMAKE with the MSVC
        REM       makefile to clean any stale build output from previous
        REM       iterations of this loop and/or previous runs of this batch
        REM       file, etc.
        REM
        IF NOT DEFINED NOCLEAN (
          CALL :fn_MakeClean %%D

          IF ERRORLEVEL 1 (
            ECHO Failed to clean for platform %%P.
            GOTO errors
          )
        ) ELSE (
          REM
          REM NOTE: Even when the cleaning step has been disabled, we still
          REM       need to remove the build output for all the files we are
          REM       specifically wanting to build for each platform.
          REM
          %_AECHO% Cleaning final core library output files only...
          %__ECHO% DEL /Q *.lo "%DLL_FILE_NAME%" "%LIB_FILE_NAME%" "%DLL_PDB_FILE_NAME%" 2%REDIRECT% NUL
        )

        REM
        REM NOTE: Call NMAKE with the MSVC makefile to build the "sqlite3.dll"
        REM       binary.  The x86 compiler will be used to compile the native
        REM       command line tools needed during the build process itself.
        REM       Also, disable looking for and/or linking to the native Tcl
        REM       runtime library.
        REM
        CALL :fn_MakeDll %%D

        IF ERRORLEVEL 1 (
          ECHO Failed to build %%B "%DLL_FILE_NAME%" for platform %%P.
          GOTO errors
        )

        REM
        REM NOTE: Copy the "sqlite3.dll" file to the appropriate directory for
        REM       the build and platform beneath the binary directory.
        REM
        %__ECHO% XCOPY "%DLL_FILE_NAME%" "%BINARYDIRECTORY%\%%B\%%D\" %FFLAGS% %DFLAGS%

        IF ERRORLEVEL 1 (
          ECHO Failed to copy "%DLL_FILE_NAME%" to "%BINARYDIRECTORY%\%%B\%%D\".
          GOTO errors
        )

        REM
        REM NOTE: Copy the "sqlite3.lib" file to the appropriate directory for
        REM       the build and platform beneath the binary directory.
        REM
        %__ECHO% XCOPY "%LIB_FILE_NAME%" "%BINARYDIRECTORY%\%%B\%%D\" %FFLAGS% %DFLAGS%

        IF ERRORLEVEL 1 (
          ECHO Failed to copy "%LIB_FILE_NAME%" to "%BINARYDIRECTORY%\%%B\%%D\".
          GOTO errors
        )

        REM
        REM NOTE: Copy the "sqlite3.pdb" file to the appropriate directory for
        REM       the build and platform beneath the binary directory unless we
        REM       are prevented from doing so.
        REM
        IF NOT DEFINED NOSYMBOLS (
          IF EXIST "%DLL_PDB_FILE_NAME%" (
            %__ECHO% XCOPY "%DLL_PDB_FILE_NAME%" "%BINARYDIRECTORY%\%%B\%%D\" %FFLAGS% %DFLAGS%

            IF ERRORLEVEL 1 (
              ECHO Failed to copy "%DLL_PDB_FILE_NAME%" to "%BINARYDIRECTORY%\%%B\%%D\".
              GOTO errors
            )
          )
        )

        REM
        REM NOTE: If requested, also build the shell executable.
        REM
        IF DEFINED BUILD_ALL_SHELL (
          REM
          REM NOTE: If necessary, make sure any previous build output for the
          REM       shell executable is deleted.
          REM
          IF DEFINED NOCLEAN (
            REM
            REM NOTE: Even when the cleaning step has been disabled, we still
            REM       need to remove the build output for all the files we are
            REM       specifically wanting to build for each platform.
            REM
            %_AECHO% Cleaning final shell executable output files only...
            %__ECHO% DEL /Q "%EXE_FILE_NAME%" "%EXE_PDB_FILE_NAME%" 2%REDIRECT% NUL
          )

          REM
          REM NOTE: Call NMAKE with the MSVC makefile to build the "sqlite3.exe"
          REM       binary.  The x86 compiler will be used to compile the native
          REM       command line tools needed during the build process itself.
          REM       Also, disable looking for and/or linking to the native Tcl
          REM       runtime library.
          REM
          CALL :fn_MakeExe %%D

          IF ERRORLEVEL 1 (
            ECHO Failed to build %%B "%EXE_FILE_NAME%" for platform %%P.
            GOTO errors
          )

          REM
          REM NOTE: Copy the "sqlite3.exe" file to the appropriate directory
          REM       for the build and platform beneath the binary directory.
          REM
          %__ECHO% XCOPY "%EXE_FILE_NAME%" "%BINARYDIRECTORY%\%%B\%%D\" %FFLAGS% %DFLAGS%

          IF ERRORLEVEL 1 (
            ECHO Failed to copy "%EXE_FILE_NAME%" to "%BINARYDIRECTORY%\%%B\%%D\".
            GOTO errors
          )

          REM
          REM NOTE: Copy the "sqlite3sh.pdb" file to the appropriate directory
          REM       for the build and platform beneath the binary directory
          REM       unless we are prevented from doing so.
          REM
          IF NOT DEFINED NOSYMBOLS (
            IF EXIST "%EXE_PDB_FILE_NAME%" (
              %__ECHO% XCOPY "%EXE_PDB_FILE_NAME%" "%BINARYDIRECTORY%\%%B\%%D\" %FFLAGS% %DFLAGS%

              IF ERRORLEVEL 1 (
                ECHO Failed to copy "%EXE_PDB_FILE_NAME%" to "%BINARYDIRECTORY%\%%B\%%D\".
                GOTO errors
              )
            )
          )
        )
      )
    )
  )

  REM
  REM NOTE: Handle any errors generated during the nested command shell.
  REM
  IF ERRORLEVEL 1 (
    GOTO errors
  )
)

REM
REM NOTE: Restore the saved current directory from the directory stack.
REM
%__ECHO2% POPD

IF ERRORLEVEL 1 (
  ECHO Could not restore directory.
  GOTO errors
)

REM
REM NOTE: If we get to this point, we have succeeded.
REM
GOTO no_errors

:fn_MakeClean
  %__ECHO% %NMAKE_CMD% clean "PLATFORM=%1" XCOMPILE=1 USE_NATIVE_LIBPATHS=1 NO_TCL=1 %NMAKE_ARGS% %NMAKE_ARGS_CFG%
  GOTO :EOF

:fn_MakeDll
  %__ECHO% %NMAKE_CMD% "%DLL_FILE_NAME%" "PLATFORM=%1" XCOMPILE=1 USE_NATIVE_LIBPATHS=1 NO_TCL=1 %NMAKE_ARGS% %NMAKE_ARGS_CFG%
  GOTO :EOF

:fn_MakeExe
  %__ECHO% %NMAKE_CMD% "%EXE_FILE_NAME%" "PLATFORM=%1" XCOMPILE=1 USE_NATIVE_LIBPATHS=1 NO_TCL=1 %NMAKE_ARGS% %NMAKE_ARGS_CFG%
  GOTO :EOF

:fn_ShowVariable
  SETLOCAL
  SET __ECHO_CMD=ECHO %%%2%%
  FOR /F "delims=" %%V IN ('%__ECHO_CMD%') DO (
    IF NOT "%%V" == "" (
      IF NOT "%%V" == "%%%2%%" (
        %_VECHO% %1 = '%%V'
      )
    )
  )
  ENDLOCAL
  GOTO :EOF

:fn_ResetErrorLevel
  VERIFY > NUL
  GOTO :EOF

:fn_SetErrorLevel
  VERIFY MAYBE 2> NUL
  GOTO :EOF

:fn_CopyVariable
  IF NOT DEFINED %1 GOTO :EOF
  IF "%2" == "" GOTO :EOF
  SETLOCAL
  SET __ECHO_CMD=ECHO %%%1%%
  FOR /F "delims=" %%V IN ('%__ECHO_CMD%') DO (
    SET VALUE=%%V
  )
  ENDLOCAL && SET %2=%VALUE%
  GOTO :EOF

:fn_UnsetVariable
  SETLOCAL
  SET VALUE=%1
  IF DEFINED VALUE (
    SET VALUE=
    ENDLOCAL
    SET %VALUE%=
  ) ELSE (
    ENDLOCAL
  )
  CALL :fn_ResetErrorLevel
  GOTO :EOF

:fn_ResetPath
  SET PATH=%TOOLPATH%;%SystemRoot%\System32;%SystemRoot%
  GOTO :EOF

:fn_AppendVariable
  SET __ECHO_CMD=ECHO %%%1%%
  IF DEFINED %1 (
    FOR /F "delims=" %%V IN ('%__ECHO_CMD%') DO (
      SET %1=%%V%~2
    )
  ) ELSE (
    SET %1=%~2
  )
  SET __ECHO_CMD=
  CALL :fn_ResetErrorLevel
  GOTO :EOF

:usage
  ECHO.
  ECHO Usage: %~nx0 ^<binaryDirectory^>
  ECHO.
  GOTO errors

:errors
  CALL :fn_SetErrorLevel
  ENDLOCAL
  ECHO.
  ECHO Failure, errors were encountered.
  GOTO end_of_file

:no_errors
  CALL :fn_ResetErrorLevel
  ENDLOCAL
  ECHO.
  ECHO Success, no errors were encountered.
  GOTO end_of_file

:end_of_file
%__ECHO% EXIT /B %ERRORLEVEL%
