@ECHO OFF

::
:: GetTclKit.bat --
::
:: TclKit Download Tool
::

SETLOCAL

REM SET __ECHO=ECHO
REM SET __ECHO2=ECHO
REM SET __ECHO3=ECHO
IF NOT DEFINED _AECHO (SET _AECHO=REM)
IF NOT DEFINED _CECHO (SET _CECHO=REM)
IF NOT DEFINED _VECHO (SET _VECHO=REM)

SET OVERWRITE=^>
IF DEFINED __ECHO SET OVERWRITE=^^^>

SET APPEND=^>^>
IF DEFINED __ECHO SET APPEND=^^^>^^^>

SET PROCESSOR=%1

IF DEFINED PROCESSOR (
  CALL :fn_UnquoteVariable PROCESSOR
) ELSE (
  GOTO usage
)

SET PROCESSOR=%PROCESSOR:AMD64=x64%

%_VECHO% Processor = '%PROCESSOR%'

SET DUMMY2=%2

IF DEFINED DUMMY2 (
  GOTO usage
)

SET ROOT=%~dp0\..
SET ROOT=%ROOT:\\=\%

%_VECHO% Root = '%ROOT%'

SET TOOLS=%~dp0
SET TOOLS=%TOOLS:~0,-1%

%_VECHO% Tools = '%TOOLS%'

IF NOT DEFINED windir (
  ECHO The windir environment variable must be set first.
  GOTO errors
)

%_VECHO% WinDir = '%windir%'

IF NOT DEFINED TEMP (
  ECHO The TEMP environment variable must be set first.
  GOTO errors
)

%_VECHO% Temp = '%TEMP%'

IF NOT DEFINED TCLKIT_URI (
  SET TCLKIT_URI=https://tclsh.com/
)

%_VECHO% TclKitUri = '%TCLKIT_URI%'

IF /I "%PROCESSOR%" == "x86" (
  CALL :fn_TclKitX86Variables
) ELSE IF /I "%PROCESSOR%" == "x64" (
  CALL :fn_TclKitX64Variables
) ELSE (
  GOTO usage
)

%_VECHO% TclKitVersion = '%TCLKIT_VERSION%'
%_VECHO% TclKitPatchLevel = '%TCLKIT_PATCHLEVEL%'
%_VECHO% TclKitNoEnv = '%TCLKIT_NOENV%'
%_VECHO% TclKitNoSdk = '%TCLKIT_NOSDK%'
%_VECHO% TclKitExe = '%TCLKIT_EXE%'
%_VECHO% TclKitLib = '%TCLKIT_LIB%'
%_VECHO% TclKitLibStub = '%TCLKIT_LIB_STUB%'
%_VECHO% TclKitSdk = '%TCLKIT_SDK%'
%_VECHO% TclKitSdkZip = '%TCLKIT_SDK_ZIP%'
%_VECHO% TclKitFiles = '%TCLKIT_FILES%'

CALL :fn_ResetErrorLevel

FOR %%T IN (csc.exe) DO (
  SET %%T_PATH=%%~dp$PATH:T
)

%_VECHO% Csc.exe_PATH = '%csc.exe_PATH%'

IF DEFINED csc.exe_PATH (
  GOTO skip_addToPath
)

IF DEFINED FRAMEWORKDIR (
  REM Use the existing .NET Framework directory...
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework64\v2.0.50727" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework64\v2.0.50727
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework64\v3.5" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework64\v3.5
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework64\v4.0.30319" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework64\v4.0.30319
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework\v2.0.50727" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework\v2.0.50727
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework\v3.5" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework\v3.5
) ELSE IF EXIST "%windir%\Microsoft.NET\Framework\v4.0.30319" (
  SET FRAMEWORKDIR=%windir%\Microsoft.NET\Framework\v4.0.30319
) ELSE (
  ECHO No suitable version of the .NET Framework appears to be installed.
  GOTO errors
)

%_VECHO% FrameworkDir = '%FRAMEWORKDIR%'

IF NOT EXIST "%FRAMEWORKDIR%\csc.exe" (
  ECHO The file "%FRAMEWORKDIR%\csc.exe" is missing.
  GOTO errors
)

CALL :fn_PrependToPath FRAMEWORKDIR

:skip_addToPath

IF NOT EXIST "%TEMP%\GetFile.exe" (
  %__ECHO% csc.exe "/out:%TEMP%\GetFile.exe" /target:exe "%TOOLS%\GetFile.cs"

  IF ERRORLEVEL 1 (
    ECHO Compilation of "%TOOLS%\GetFile.cs" failed.
    GOTO errors
  )
)

FOR %%F IN (%TCLKIT_FILES%) DO (
  IF NOT EXIST "%TEMP%\%%F" (
    %__ECHO% "%TEMP%\GetFile.exe" "%TCLKIT_URI%%%F"

    IF ERRORLEVEL 1 (
      ECHO Download of "%%F" from "%TCLKIT_URI%" failed.
      GOTO errors
    )
  )
)

IF DEFINED TCLKIT_NOENV GOTO skip_sdkUnZip
IF DEFINED TCLKIT_NOSDK GOTO skip_sdkUnZip

IF NOT EXIST "%TEMP%\%TCLKIT_SDK%" (
  %__ECHO% MKDIR "%TEMP%\%TCLKIT_SDK%"

  IF ERRORLEVEL 1 (
    ECHO Could not create directory "%TEMP%\%TCLKIT_SDK%".
    GOTO errors
  )
)

%__ECHO% "%TEMP%\unzip.exe" -n "%TEMP%\%TCLKIT_SDK_ZIP%" -d "%TEMP%\%TCLKIT_SDK%"

IF ERRORLEVEL 1 (
  ECHO Could not unzip "%TEMP%\%TCLKIT_SDK_ZIP%" to "%TEMP%\%TCLKIT_SDK%".
  GOTO errors
)

:skip_sdkUnZip

IF DEFINED TCLKIT_NOENV GOTO skip_sdkEnvironment

%__ECHO% ECHO SET TCLSH_CMD=%TEMP%\%TCLKIT_EXE%%OVERWRITE%"%ROOT%\SetTclKitEnv.bat"

IF DEFINED TCLKIT_NOSDK GOTO skip_sdkVariables

%__ECHO% ECHO SET TCLINCDIR=%TEMP%\%TCLKIT_SDK%\include%APPEND%"%ROOT%\SetTclKitEnv.bat"
%__ECHO% ECHO SET TCLLIBDIR=%TEMP%\%TCLKIT_SDK%\lib%APPEND%"%ROOT%\SetTclKitEnv.bat"
%__ECHO% ECHO SET LIBTCLPATH=%TEMP%\%TCLKIT_SDK%\lib%APPEND%"%ROOT%\SetTclKitEnv.bat"
%__ECHO% ECHO SET LIBTCL=%TCLKIT_LIB%%APPEND%"%ROOT%\SetTclKitEnv.bat"
%__ECHO% ECHO SET LIBTCLSTUB=%TCLKIT_LIB_STUB%%APPEND%"%ROOT%\SetTclKitEnv.bat"

:skip_sdkVariables

ECHO.
ECHO Wrote "%ROOT%\SetTclKitEnv.bat".
ECHO Please run it to set the necessary Tcl environment variables.
ECHO.

:skip_sdkEnvironment

GOTO no_errors

:fn_TclKitX86Variables
  REM
  REM NOTE: By default, use latest available version of the TclKit SDK
  REM       for x86.  However, the "default" TclKit executable for x86
  REM       is still used here because it is the only one "well-known"
  REM       to be available for download.
  REM
  IF NOT DEFINED TCLKIT_PATCHLEVEL (
    SET TCLKIT_PATCHLEVEL=8.6.6
  )
  SET TCLKIT_VERSION=%TCLKIT_PATCHLEVEL:.=%
  SET TCLKIT_VERSION=%TCLKIT_VERSION:~0,2%
  REM SET TCLKIT_EXE=tclkit-%TCLKIT_PATCHLEVEL%.exe
  SET TCLKIT_EXE=tclkit-8.6.4.exe
  SET TCLKIT_LIB=libtclkit%TCLKIT_PATCHLEVEL:.=%.lib
  SET TCLKIT_LIB_STUB=libtclstub%TCLKIT_VERSION:.=%.a
  SET TCLKIT_SDK=libtclkit-sdk-x86-%TCLKIT_PATCHLEVEL%
  SET TCLKIT_SDK_ZIP=%TCLKIT_SDK%.zip
  SET TCLKIT_FILES=%TCLKIT_EXE%
  IF NOT DEFINED TCLKIT_NOENV IF NOT DEFINED TCLKIT_NOSDK (
    SET TCLKIT_FILES=%TCLKIT_FILES% unzip.exe %TCLKIT_SDK_ZIP%
  )
  GOTO :EOF

:fn_TclKitX64Variables
  REM
  REM NOTE: By default, use latest available version of the TclKit SDK
  REM       for x64.  However, the "default" TclKit executable for x86
  REM       is still used here because it is the only one "well-known"
  REM       to be available for download.
  REM
  IF NOT DEFINED TCLKIT_PATCHLEVEL (
    SET TCLKIT_PATCHLEVEL=8.6.6
  )
  SET TCLKIT_VERSION=%TCLKIT_PATCHLEVEL:.=%
  SET TCLKIT_VERSION=%TCLKIT_VERSION:~0,2%
  REM SET TCLKIT_EXE=tclkit-%TCLKIT_PATCHLEVEL%.exe
  SET TCLKIT_EXE=tclkit-8.6.4.exe
  SET TCLKIT_LIB=libtclkit%TCLKIT_PATCHLEVEL:.=%.lib
  SET TCLKIT_LIB_STUB=libtclstub%TCLKIT_VERSION:.=%.a
  SET TCLKIT_SDK=libtclkit-sdk-x64-%TCLKIT_PATCHLEVEL%
  SET TCLKIT_SDK_ZIP=%TCLKIT_SDK%.zip
  SET TCLKIT_FILES=%TCLKIT_EXE%
  IF NOT DEFINED TCLKIT_NOENV IF NOT DEFINED TCLKIT_NOSDK (
    SET TCLKIT_FILES=%TCLKIT_FILES% unzip.exe %TCLKIT_SDK_ZIP%
  )
  GOTO :EOF

:fn_UnquoteVariable
  IF NOT DEFINED %1 GOTO :EOF
  SETLOCAL
  SET __ECHO_CMD=ECHO %%%1%%
  FOR /F "delims=" %%V IN ('%__ECHO_CMD%') DO (
    SET VALUE=%%V
  )
  SET VALUE=%VALUE:"=%
  REM "
  ENDLOCAL && SET %1=%VALUE%
  GOTO :EOF

:fn_PrependToPath
  IF NOT DEFINED %1 GOTO :EOF
  SETLOCAL
  SET __ECHO_CMD=ECHO %%%1%%
  FOR /F "delims=" %%V IN ('%__ECHO_CMD%') DO (
    SET VALUE=%%V
  )
  SET VALUE=%VALUE:"=%
  REM "
  ENDLOCAL && SET PATH=%VALUE%;%PATH%
  GOTO :EOF

:fn_ResetErrorLevel
  VERIFY > NUL
  GOTO :EOF

:fn_SetErrorLevel
  VERIFY MAYBE 2> NUL
  GOTO :EOF

:usage
  ECHO.
  ECHO Usage: %~nx0 ^<processor^>
  ECHO.
  ECHO The only supported values for processor are "x86" and "x64".
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
