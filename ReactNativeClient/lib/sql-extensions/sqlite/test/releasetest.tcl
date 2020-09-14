#!/usr/bin/tclsh
#
# Documentation for this script. This may be output to stderr
# if the script is invoked incorrectly. See the [process_options]
# proc below.
#
set ::USAGE_MESSAGE {
This Tcl script is used to test the various configurations required
before releasing a new version. Supported command line options (all
optional) are:

    --buildonly                        (Just build testfixture - do not run)
    --config   CONFIGNAME              (Run only CONFIGNAME)
    --dryrun                           (Print what would have happened)
    -f|--force                         (Run even if uncommitted changes)
    --info                             (Show diagnostic info)
    --jobs     N                       (Use N processes - default 1)
    --keep                             (Delete no files after each test run)
    --msvc                             (Use MSVC as the compiler)
    --platform PLATFORM                (see below)
    --progress                         (Show progress messages)
    --quick                            (Run "veryquick.test" only)
    --veryquick                        (Run "make smoketest" only)
    --with-tcl=DIR                     (Use TCL build at DIR)

The script determines the default value for --platform using the
$tcl_platform(os) and $tcl_platform(machine) variables.  Supported
platforms are "Linux-x86", "Linux-x86_64", "Darwin-i386",
"Darwin-x86_64", "Windows NT-intel", and "Windows NT-amd64".

Every test begins with a fresh run of the configure script at the top
of the SQLite source tree.
}

# Return a timestamp of the form HH:MM:SS
#
proc now {} {
  return [clock format [clock seconds] -format %H:%M:%S]
}

# Omit comments (text between # and \n) in a long multi-line string.
#
proc strip_comments {in} {
  regsub -all {#[^\n]*\n} $in {} out
  return $out
}

array set ::Configs [strip_comments {
  "Default" {
    -O2
    --disable-amalgamation --disable-shared
    --enable-session
    -DSQLITE_ENABLE_DESERIALIZE
  }
  "Sanitize" {
    CC=clang -fsanitize=undefined
    -DSQLITE_ENABLE_STAT4
    --enable-session
  }
  "Stdcall" {
    -DUSE_STDCALL=1
    -O2
  }
  "Have-Not" {
    # The "Have-Not" configuration sets all possible -UHAVE_feature options
    # in order to verify that the code works even on platforms that lack
    # these support services.
    -DHAVE_FDATASYNC=0
    -DHAVE_GMTIME_R=0
    -DHAVE_ISNAN=0
    -DHAVE_LOCALTIME_R=0
    -DHAVE_LOCALTIME_S=0
    -DHAVE_MALLOC_USABLE_SIZE=0
    -DHAVE_STRCHRNUL=0
    -DHAVE_USLEEP=0
    -DHAVE_UTIME=0
  }
  "Unlock-Notify" {
    -O2
    -DSQLITE_ENABLE_UNLOCK_NOTIFY
    -DSQLITE_THREADSAFE
    -DSQLITE_TCL_DEFAULT_FULLMUTEX=1
  }
  "User-Auth" {
    -O2
    -DSQLITE_USER_AUTHENTICATION=1
  }
  "Secure-Delete" {
    -O2
    -DSQLITE_SECURE_DELETE=1
    -DSQLITE_SOUNDEX=1
  }
  "Update-Delete-Limit" {
    -O2
    -DSQLITE_DEFAULT_FILE_FORMAT=4
    -DSQLITE_ENABLE_UPDATE_DELETE_LIMIT=1
    -DSQLITE_ENABLE_STMT_SCANSTATUS
    -DSQLITE_LIKE_DOESNT_MATCH_BLOBS
    -DSQLITE_ENABLE_CURSOR_HINTS
    --enable-json1
  }
  "Check-Symbols" {
    -DSQLITE_MEMDEBUG=1
    -DSQLITE_ENABLE_FTS3_PARENTHESIS=1
    -DSQLITE_ENABLE_FTS3=1
    -DSQLITE_ENABLE_RTREE=1
    -DSQLITE_ENABLE_MEMSYS5=1
    -DSQLITE_ENABLE_MEMSYS3=1
    -DSQLITE_ENABLE_COLUMN_METADATA=1
    -DSQLITE_ENABLE_UPDATE_DELETE_LIMIT=1
    -DSQLITE_SECURE_DELETE=1
    -DSQLITE_SOUNDEX=1
    -DSQLITE_ENABLE_ATOMIC_WRITE=1
    -DSQLITE_ENABLE_MEMORY_MANAGEMENT=1
    -DSQLITE_ENABLE_OVERSIZE_CELL_CHECK=1
    -DSQLITE_ENABLE_STAT4
    -DSQLITE_ENABLE_STMT_SCANSTATUS
    --enable-json1 --enable-fts5 --enable-session
  }
  "Debug-One" {
    --disable-shared
    -O2 -funsigned-char
    -DSQLITE_DEBUG=1
    -DSQLITE_MEMDEBUG=1
    -DSQLITE_MUTEX_NOOP=1
    -DSQLITE_TCL_DEFAULT_FULLMUTEX=1
    -DSQLITE_ENABLE_FTS3=1
    -DSQLITE_ENABLE_RTREE=1
    -DSQLITE_ENABLE_MEMSYS5=1
    -DSQLITE_ENABLE_COLUMN_METADATA=1
    -DSQLITE_ENABLE_STAT4
    -DSQLITE_ENABLE_HIDDEN_COLUMNS
    -DSQLITE_MAX_ATTACHED=125
    -DSQLITE_MUTATION_TEST
    --enable-fts5 --enable-json1
  }
  "Fast-One" {
    -O6
    -DSQLITE_ENABLE_FTS4=1
    -DSQLITE_ENABLE_RTREE=1
    -DSQLITE_ENABLE_STAT4
    -DSQLITE_ENABLE_RBU
    -DSQLITE_MAX_ATTACHED=125
    -DLONGDOUBLE_TYPE=double
    --enable-session
  }
  "Device-One" {
    -O2
    -DSQLITE_DEBUG=1
    -DSQLITE_DEFAULT_AUTOVACUUM=1
    -DSQLITE_DEFAULT_CACHE_SIZE=64
    -DSQLITE_DEFAULT_PAGE_SIZE=1024
    -DSQLITE_DEFAULT_TEMP_CACHE_SIZE=32
    -DSQLITE_DISABLE_LFS=1
    -DSQLITE_ENABLE_ATOMIC_WRITE=1
    -DSQLITE_ENABLE_IOTRACE=1
    -DSQLITE_ENABLE_MEMORY_MANAGEMENT=1
    -DSQLITE_MAX_PAGE_SIZE=4096
    -DSQLITE_OMIT_LOAD_EXTENSION=1
    -DSQLITE_OMIT_PROGRESS_CALLBACK=1
    -DSQLITE_OMIT_VIRTUALTABLE=1
    -DSQLITE_ENABLE_HIDDEN_COLUMNS
    -DSQLITE_TEMP_STORE=3
    --enable-json1
  }
  "Device-Two" {
    -DSQLITE_4_BYTE_ALIGNED_MALLOC=1
    -DSQLITE_DEFAULT_AUTOVACUUM=1
    -DSQLITE_DEFAULT_CACHE_SIZE=1000
    -DSQLITE_DEFAULT_LOCKING_MODE=0
    -DSQLITE_DEFAULT_PAGE_SIZE=1024
    -DSQLITE_DEFAULT_TEMP_CACHE_SIZE=1000
    -DSQLITE_DISABLE_LFS=1
    -DSQLITE_ENABLE_FTS3=1
    -DSQLITE_ENABLE_MEMORY_MANAGEMENT=1
    -DSQLITE_ENABLE_RTREE=1
    -DSQLITE_MAX_COMPOUND_SELECT=50
    -DSQLITE_MAX_PAGE_SIZE=32768
    -DSQLITE_OMIT_TRACE=1
    -DSQLITE_TEMP_STORE=3
    -DSQLITE_THREADSAFE=2
    -DSQLITE_ENABLE_DESERIALIZE=1
    --enable-json1 --enable-fts5 --enable-session
  }
  "Locking-Style" {
    -O2
    -DSQLITE_ENABLE_LOCKING_STYLE=1
  }
  "Apple" {
    -Os
    -DHAVE_GMTIME_R=1
    -DHAVE_ISNAN=1
    -DHAVE_LOCALTIME_R=1
    -DHAVE_PREAD=1
    -DHAVE_PWRITE=1
    -DHAVE_USLEEP=1
    -DHAVE_USLEEP=1
    -DHAVE_UTIME=1
    -DSQLITE_DEFAULT_CACHE_SIZE=1000
    -DSQLITE_DEFAULT_CKPTFULLFSYNC=1
    -DSQLITE_DEFAULT_MEMSTATUS=1
    -DSQLITE_DEFAULT_PAGE_SIZE=1024
    -DSQLITE_DISABLE_PAGECACHE_OVERFLOW_STATS=1
    -DSQLITE_ENABLE_API_ARMOR=1
    -DSQLITE_ENABLE_AUTO_PROFILE=1
    -DSQLITE_ENABLE_FLOCKTIMEOUT=1
    -DSQLITE_ENABLE_FTS3=1
    -DSQLITE_ENABLE_FTS3_PARENTHESIS=1
    -DSQLITE_ENABLE_FTS3_TOKENIZER=1
    if:os=="Darwin" -DSQLITE_ENABLE_LOCKING_STYLE=1
    -DSQLITE_ENABLE_PERSIST_WAL=1
    -DSQLITE_ENABLE_PURGEABLE_PCACHE=1
    -DSQLITE_ENABLE_RTREE=1
    -DSQLITE_ENABLE_SNAPSHOT=1
    # -DSQLITE_ENABLE_SQLLOG=1
    -DSQLITE_ENABLE_UPDATE_DELETE_LIMIT=1
    -DSQLITE_MAX_LENGTH=2147483645
    -DSQLITE_MAX_VARIABLE_NUMBER=500000
    # -DSQLITE_MEMDEBUG=1
    -DSQLITE_NO_SYNC=1
    -DSQLITE_OMIT_AUTORESET=1
    -DSQLITE_OMIT_LOAD_EXTENSION=1
    -DSQLITE_PREFER_PROXY_LOCKING=1
    -DSQLITE_SERIES_CONSTRAINT_VERIFY=1
    -DSQLITE_THREADSAFE=2
    -DSQLITE_USE_URI=1
    -DSQLITE_WRITE_WALFRAME_PREBUFFERED=1
    -DUSE_GUARDED_FD=1
    -DUSE_PREAD=1
    --enable-json1 --enable-fts5
  }
  "Extra-Robustness" {
    -DSQLITE_ENABLE_OVERSIZE_CELL_CHECK=1
    -DSQLITE_MAX_ATTACHED=62
  }
  "Devkit" {
    -DSQLITE_DEFAULT_FILE_FORMAT=4
    -DSQLITE_MAX_ATTACHED=30
    -DSQLITE_ENABLE_COLUMN_METADATA
    -DSQLITE_ENABLE_FTS4
    -DSQLITE_ENABLE_FTS5
    -DSQLITE_ENABLE_FTS4_PARENTHESIS
    -DSQLITE_DISABLE_FTS4_DEFERRED
    -DSQLITE_ENABLE_RTREE
    --enable-json1 --enable-fts5
  }
  "No-lookaside" {
    -DSQLITE_TEST_REALLOC_STRESS=1
    -DSQLITE_OMIT_LOOKASIDE=1
    -DHAVE_USLEEP=1
  }
  "Valgrind" {
    -DSQLITE_ENABLE_STAT4
    -DSQLITE_ENABLE_FTS4
    -DSQLITE_ENABLE_RTREE
    -DSQLITE_ENABLE_HIDDEN_COLUMNS
    --enable-json1
  }

  # The next group of configurations are used only by the
  # Failure-Detection platform.  They are all the same, but we need
  # different names for them all so that they results appear in separate
  # subdirectories.
  #
  Fail0 {-O0}
  Fail2 {-O0}
  Fail3 {-O0}
  Fail4 {-O0}
  FuzzFail1 {-O0}
  FuzzFail2 {-O0}
}]

array set ::Platforms [strip_comments {
  Linux-x86_64 {
    "Check-Symbols"           checksymbols
    "Fast-One"                "fuzztest test"
    "Debug-One"               "mptest test"
    "Have-Not"                test
    "Secure-Delete"           test
    "Unlock-Notify"           "QUICKTEST_INCLUDE=notify2.test test"
    "User-Auth"               tcltest
    "Update-Delete-Limit"     test
    "Extra-Robustness"        test
    "Device-Two"              "threadtest test"
    "No-lookaside"            test
    "Devkit"                  test
    "Apple"                   test
    "Sanitize"                {QUICKTEST_OMIT=func4.test,nan.test test}
    "Device-One"              fulltest
    "Default"                 "threadtest fulltest"
    "Valgrind"                valgrindtest
  }
  Linux-i686 {
    "Devkit"                  test
    "Have-Not"                test
    "Unlock-Notify"           "QUICKTEST_INCLUDE=notify2.test test"
    "Device-One"              test
    "Device-Two"              test
    "Default"                 "threadtest fulltest"
  }
  Darwin-i386 {
    "Locking-Style"           "mptest test"
    "Have-Not"                test
    "Apple"                   "threadtest fulltest"
  }
  Darwin-x86_64 {
    "Locking-Style"           "mptest test"
    "Have-Not"                test
    "Apple"                   "threadtest fulltest"
  }
  "Windows NT-intel" {
    "Stdcall"                 test
    "Have-Not"                test
    "Default"                 "mptest fulltestonly"
  }
  "Windows NT-amd64" {
    "Stdcall"                 test
    "Have-Not"                test
    "Default"                 "mptest fulltestonly"
  }

  # The Failure-Detection platform runs various tests that deliberately
  # fail.  This is used as a test of this script to verify that this script
  # correctly identifies failures.
  #
  Failure-Detection {
    Fail0     "TEST_FAILURE=0 test"
    Sanitize  "TEST_FAILURE=1 test"
    Fail2     "TEST_FAILURE=2 valgrindtest"
    Fail3     "TEST_FAILURE=3 valgrindtest"
    Fail4     "TEST_FAILURE=4 test"
    FuzzFail1 "TEST_FAILURE=5 test"
    FuzzFail2 "TEST_FAILURE=5 valgrindtest"
  }
}]


# End of configuration section.
#########################################################################
#########################################################################

# Configuration verification: Check that each entry in the list of configs
# specified for each platforms exists.
#
foreach {key value} [array get ::Platforms] {
  foreach {v t} $value {
    if {0==[info exists ::Configs($v)]} {
      puts stderr "No such configuration: \"$v\""
      exit -1
    }
  }
}

# Output log.   Disabled for slave interpreters.
#
if {[lindex $argv end]!="--slave"} {
  set LOG [open releasetest-out.txt w]
  proc PUTS {txt} {
    puts $txt
    puts $::LOG $txt
    flush $::LOG
  }
  proc PUTSNNL {txt} {
    puts -nonewline $txt
    puts -nonewline $::LOG $txt
    flush $::LOG
  }
  proc PUTSERR {txt} {
    puts stderr $txt
    puts $::LOG $txt
    flush $::LOG
  }
  puts $LOG "$argv0 $argv"
  set tm0 [clock format [clock seconds] -format {%Y-%m-%d %H:%M:%S} -gmt 1]
  puts $LOG "start-time: $tm0 UTC"
} else {
  proc PUTS {txt} {
    puts $txt
  }
  proc PUTSNNL {txt} {
    puts -nonewline $txt
  }
  proc PUTSERR {txt} {
    puts stderr $txt
  }
}

# Open the file $logfile and look for a report on the number of errors
# and the number of test cases run.  Add these values to the global
# $::NERRCASE and $::NTESTCASE variables.
#
# If any errors occur, then write into $errmsgVar the text of an appropriate
# one-line error message to show on the output.
#
proc count_tests_and_errors {logfile rcVar errmsgVar} {
  if {$::DRYRUN} return
  upvar 1 $rcVar rc $errmsgVar errmsg
  set fd [open $logfile rb]
  set seen 0
  while {![eof $fd]} {
    set line [gets $fd]
    if {[regexp {(\d+) errors out of (\d+) tests} $line all nerr ntest]} {
      incr ::NERRCASE $nerr
      incr ::NTESTCASE $ntest
      set seen 1
      if {$nerr>0} {
        set rc 1
        set errmsg $line
      }
    }
    if {[regexp {runtime error: +(.*)} $line all msg]} {
      # skip over "value is outside range" errors
      if {[regexp {value .* is outside the range of representable} $line]} {
         # noop
      } elseif {[regexp {overflow: .* cannot be represented} $line]} {
         # noop
      } else {
        incr ::NERRCASE
        if {$rc==0} {
          set rc 1
          set errmsg $msg
        }
      }
    }
    if {[regexp {fatal error +(.*)} $line all msg]} {
      incr ::NERRCASE
      if {$rc==0} {
        set rc 1
        set errmsg $msg
      }
    }
    if {[regexp {ERROR SUMMARY: (\d+) errors.*} $line all cnt] && $cnt>0} {
      incr ::NERRCASE
      if {$rc==0} {
        set rc 1
        set errmsg $all
      }
    }
    if {[regexp {^VERSION: 3\.\d+.\d+} $line]} {
      set v [string range $line 9 end]
      if {$::SQLITE_VERSION eq ""} {
        set ::SQLITE_VERSION $v
      } elseif {$::SQLITE_VERSION ne $v} {
        set rc 1
        set errmsg "version conflict: {$::SQLITE_VERSION} vs. {$v}"
      }
    }
  }
  close $fd
  if {$::BUILDONLY} {
    incr ::NTESTCASE
    if {$rc!=0} {
      set errmsg "Build failed"
    }
  } elseif {!$seen} {
    set rc 1
    set errmsg "Test did not complete"
    if {[file readable core]} {
      append errmsg " - core file exists"
    }
  }
}

#--------------------------------------------------------------------------
# This command is invoked as the [main] routine for scripts run with the
# "--slave" option.
#
# For each test (i.e. "configure && make test" execution), the master
# process spawns a process with the --slave option. It writes two lines
# to the slaves stdin. The first contains a single boolean value - the
# value of ::TRACE to use in the slave script. The second line contains a
# list in the same format as each element of the list passed to the
# [run_all_test_suites] command in the master process.
#
# The slave then runs the "configure && make test" commands specified. It
# exits successfully if the tests passes, or with a non-zero error code
# otherwise.
#
proc run_slave_test {} {
  # Read global vars configuration from stdin.
  set V [gets stdin]
  foreach {::TRACE ::MSVC ::DRYRUN ::KEEPFILES} $V {}

  # Read the test-suite configuration from stdin.
  set T [gets stdin]
  foreach {title dir configOpts testtarget makeOpts cflags opts} $T {}

  # Create and switch to the test directory.
  set normaldir [file normalize $dir]
  set ::env(SQLITE_TMPDIR) $normaldir
  trace_cmd file mkdir $dir
  trace_cmd cd $dir
  catch {file delete core}
  catch {file delete test.log}

  # Run the "./configure && make" commands.
  set rc 0
  set rc [catch [configureCommand $configOpts]]
  if {!$rc} {
    if {[info exists ::env(TCLSH_CMD)]} {
      set savedEnv(TCLSH_CMD) $::env(TCLSH_CMD)
    } else {
      unset -nocomplain savedEnv(TCLSH_CMD)
    }
    set ::env(TCLSH_CMD) [file nativename [info nameofexecutable]]

    # Create a file called "makecommand.sh" containing the text of
    # the make command line.
    catch {
      set cmd [makeCommand $testtarget $makeOpts $cflags $opts]
      set fd [open makecommand.sh w]
      foreach e $cmd { 
        if {[string first " " $e]>=0} {
          puts -nonewline $fd "\"$e\""
        } else {
          puts -nonewline $fd $e
        }
        puts -nonewline $fd " "
      }
      puts $fd ""
      close $fd
    } msg

    # Run the make command.
    set rc [catch {trace_cmd exec {*}$cmd >>& test.log} msg]
    if {[info exists savedEnv(TCLSH_CMD)]} {
      set ::env(TCLSH_CMD) $savedEnv(TCLSH_CMD)
    } else {
      unset -nocomplain ::env(TCLSH_CMD)
    }
  }

  # Clean up lots of extra files if --keep was not specified.
  if {$::KEEPFILES==0} { cleanup $normaldir }

  # Exis successfully if the test passed, or with a non-zero error code
  # otherwise.
  exit $rc
}

# This command is invoked in the master process each time a slave
# file-descriptor is readable.
#
proc slave_fileevent {fd T tm1} {
  global G
  foreach {title dir configOpts testtarget makeOpts cflags opts} $T {}

  if {[eof $fd]} {
    fconfigure $fd -blocking 1
    set rc [catch { close $fd }]

    set errmsg {}
    set logfile [file join $dir test.log]
    if {[file exists $logfile]} {
      count_tests_and_errors [file join $dir test.log] rc errmsg
    } elseif {$rc==0 && !$::DRYRUN} {
      set rc 1
      set errmsg "no test.log file..."
    }

    if {!$::TRACE} {
      set tm2 [clock seconds]
      set hours [expr {($tm2-$tm1)/3600}]
      set minutes [expr {(($tm2-$tm1)/60)%60}]
      set seconds [expr {($tm2-$tm1)%60}]
      set tm [format (%02d:%02d:%02d) $hours $minutes $seconds]

      if {$rc} {
        set status FAIL
        incr ::NERR
      } else {
        set status Ok
      }

      set n [string length $title]
      if {$::PROGRESS_MSGS} {
        PUTS "finished: ${title}[string repeat . [expr {53-$n}]] $status $tm"
      } else {
        PUTS "${title}[string repeat . [expr {63-$n}]] $status $tm"
      }
      if {$errmsg!=""} {PUTS "     $errmsg"}
      flush stdout
    }

    incr G(nJob) -1
  } else {
    set line [gets $fd]
    if {[string trim $line] != ""} {
      puts "Trace   : $title - \"$line\""
    }
  }
}

#--------------------------------------------------------------------------
# The only argument passed to this function is a list of test-suites to
# run. Each "test-suite" is itself a list consisting of the following
# elements:
#
#   * Test title (for display).
#   * The name of the directory to run the test in.
#   * The argument for [configureCommand]
#   * The first argument for [makeCommand]
#   * The second argument for [makeCommand]
#   * The third argument for [makeCommand]
#
proc run_all_test_suites {alltests} {
  global G
  set tests $alltests

  set G(nJob) 0

  while {[llength $tests]>0 || $G(nJob)>0} {
    if {$G(nJob)>=$::JOBS || [llength $tests]==0} {
      vwait G(nJob)
    }

    if {[llength $tests]>0} {
      set T [lindex $tests 0]
      set tests [lrange $tests 1 end]
      foreach {title dir configOpts testtarget makeOpts cflags opts} $T {}
      if {$::PROGRESS_MSGS && !$::TRACE} {
        set n [string length $title]
        PUTS "starting: ${title} at [now]"
        flush stdout
      }

      # Run the job.
      #
      set tm1 [clock seconds]
      incr G(nJob)
      set script [file normalize [info script]]
      set fd [open "|[info nameofexecutable] $script --slave" r+]
      fconfigure $fd -blocking 0
      fileevent $fd readable [list slave_fileevent $fd $T $tm1]
      puts $fd [list $::TRACE $::MSVC $::DRYRUN $::KEEPFILES]
      puts $fd [list {*}$T]
      flush $fd
    }
  }
}

proc add_test_suite {listvar name testtarget config} {
  upvar $listvar alltests

  # Tcl variable $opts is used to build up the value used to set the
  # OPTS Makefile variable. Variable $cflags holds the value for
  # CFLAGS. The makefile will pass OPTS to both gcc and lemon, but
  # CFLAGS is only passed to gcc.
  #
  set makeOpts ""
  set cflags [expr {$::MSVC ? "-Zi" : "-g"}]
  set opts ""
  set title ${name}($testtarget)
  set configOpts $::WITHTCL
  set skip 0

  regsub -all {#[^\n]*\n} $config \n config
  foreach arg $config {
    if {$skip} {
      set skip 0
      continue
    }
    if {[regexp {^-[UD]} $arg]} {
      lappend opts $arg
    } elseif {[regexp {^[A-Z]+=} $arg]} {
      lappend testtarget $arg
    } elseif {[regexp {^if:([a-z]+)(.*)} $arg all key tail]} {
      # Arguments of the form 'if:os=="Linux"' will cause the subsequent
      # argument to be skipped if the $tcl_platform(os) is not "Linux", for
      # example...
      set skip [expr !(\$::tcl_platform($key)$tail)]
    } elseif {[regexp {^--(enable|disable)-} $arg]} {
      if {$::MSVC} {
        if {$arg eq "--disable-amalgamation"} {
          lappend makeOpts USE_AMALGAMATION=0
          continue
        }
        if {$arg eq "--disable-shared"} {
          lappend makeOpts USE_CRT_DLL=0 DYNAMIC_SHELL=0
          continue
        }
        if {$arg eq "--enable-fts5"} {
          lappend opts -DSQLITE_ENABLE_FTS5
          continue
        }
        if {$arg eq "--enable-json1"} {
          lappend opts -DSQLITE_ENABLE_JSON1
          continue
        }
        if {$arg eq "--enable-shared"} {
          lappend makeOpts USE_CRT_DLL=1 DYNAMIC_SHELL=1
          continue
        }
      }
      lappend configOpts $arg
    } else {
      if {$::MSVC} {
        if {$arg eq "-g"} {
          lappend cflags -Zi
          continue
        }
        if {[regexp -- {^-O(\d+)$} $arg all level]} then {
          lappend makeOpts OPTIMIZATIONS=$level
          continue
        }
      }
      lappend cflags $arg
    }
  }

  # Disable sync to make testing faster.
  #
  lappend opts -DSQLITE_NO_SYNC=1

  # Some configurations already set HAVE_USLEEP; in that case, skip it.
  #
  if {[lsearch -regexp $opts {^-DHAVE_USLEEP(?:=|$)}]==-1} {
    lappend opts -DHAVE_USLEEP=1
  }

  # Add the define for this platform.
  #
  if {$::tcl_platform(platform)=="windows"} {
    lappend opts -DSQLITE_OS_WIN=1
  } else {
    lappend opts -DSQLITE_OS_UNIX=1
  }

  # Set the sub-directory to use.
  #
  set dir [string tolower [string map {- _ " " _} $name]]

  # Join option lists into strings, using space as delimiter.
  #
  set makeOpts [join $makeOpts " "]
  set cflags   [join $cflags " "]
  set opts     [join $opts " "]

  lappend alltests [list \
      $title $dir $configOpts $testtarget $makeOpts $cflags $opts]
}

# The following procedure returns the "configure" command to be exectued for
# the current platform, which may be Windows (via MinGW, etc).
#
proc configureCommand {opts} {
  if {$::MSVC} return [list]; # This is not needed for MSVC.
  set result [list trace_cmd exec]
  if {$::tcl_platform(platform)=="windows"} {
    lappend result sh
  }
  lappend result $::SRCDIR/configure --enable-load-extension
  foreach x $opts {lappend result $x}
  lappend result >& test.log
}

# The following procedure returns the "make" command to be executed for the
# specified targets, compiler flags, and options.
#
proc makeCommand { targets makeOpts cflags opts } {
  set result [list]
  if {$::MSVC} {
    set nmakeDir [file nativename $::SRCDIR]
    set nmakeFile [file nativename [file join $nmakeDir Makefile.msc]]
    lappend result nmake /f $nmakeFile TOP=$nmakeDir
    set tclDir [file nativename [file normalize \
        [file dirname [file dirname [info nameofexecutable]]]]]
    lappend result "TCLDIR=$tclDir"
    if {[regexp {USE_STDCALL=1} $cflags]} {
      lappend result USE_STDCALL=1
    }
  } else {
    lappend result make
  }
  foreach makeOpt $makeOpts {
    lappend result $makeOpt
  }
  lappend result clean
  foreach target $targets {
    lappend result $target
  }
  lappend result CFLAGS=$cflags OPTS=$opts
}

# The following procedure prints its arguments if ::TRACE is true.
# And it executes the command of its arguments in the calling context
# if ::DRYRUN is false.
#
proc trace_cmd {args} {
  if {$::TRACE} {
    PUTS $args
  }
  set res ""
  if {!$::DRYRUN} {
    set res [uplevel 1 $args]
  }
  return $res
}


# This proc processes the command line options passed to this script.
# Currently the only option supported is "-makefile", default
# "releasetest.mk". Set the ::MAKEFILE variable to the value of this
# option.
#
proc process_options {argv} {
  set ::SRCDIR    [file normalize [file dirname [file dirname $::argv0]]]
  set ::QUICK          0
  set ::MSVC           0
  set ::BUILDONLY      0
  set ::DRYRUN         0
  set ::TRACE          0
  set ::JOBS           1
  set ::PROGRESS_MSGS  0
  set ::WITHTCL        {}
  set ::FORCE          0
  set ::KEEPFILES      0          ;# Keep extra files after test run
  set config {}
  set platform $::tcl_platform(os)-$::tcl_platform(machine)

  for {set i 0} {$i < [llength $argv]} {incr i} {
    set x [lindex $argv $i]
    if {[regexp {^--[a-z]} $x]} {set x [string range $x 1 end]}
    switch -glob -- $x {
      -slave {
        run_slave_test
        exit
      }

      # Undocumented legacy option: --srcdir DIRECTORY
      #
      # DIRECTORY is the root of the SQLite checkout.  This sets the
      # SRCDIR global variable.  But that variable is already set
      # automatically so there really is no reason to have this option.
      #
      -srcdir {
        incr i
        set ::SRCDIR [file normalize [lindex $argv $i]]
      }

      -platform {
        incr i
        set platform [lindex $argv $i]
      }

      -jobs {
        incr i
        set ::JOBS [lindex $argv $i]
      }

      -progress {
        set ::PROGRESS_MSGS 1
      }

      -quick {
        set ::QUICK 1
      }
      -veryquick {
        set ::QUICK 2
      }

      -config {
        incr i
        set config [lindex $argv $i]
      }

      -msvc {
        set ::MSVC 1
      }

      -buildonly {
        set ::BUILDONLY 1
      }

      -dryrun {
        set ::DRYRUN 1
      }

      -force -
      -f {
        set ::FORCE 1
      }

      -trace {
        set ::TRACE 1
      }

      -info {
        PUTS "Command-line Options:"
        PUTS "   --srcdir $::SRCDIR"
        PUTS "   --platform [list $platform]"
        PUTS "   --config [list $config]"
        if {$::QUICK} {
          if {$::QUICK==1} {PUTS "   --quick"}
          if {$::QUICK==2} {PUTS "   --veryquick"}
        }
        if {$::MSVC}      {PUTS "   --msvc"}
        if {$::BUILDONLY} {PUTS "   --buildonly"}
        if {$::DRYRUN}    {PUTS "   --dryrun"}
        if {$::TRACE}     {PUTS "   --trace"}
        PUTS "\nAvailable --platform options:"
        foreach y [lsort [array names ::Platforms]] {
          PUTS "   [list $y]"
        }
        PUTS "\nAvailable --config options:"
        foreach y [lsort [array names ::Configs]] {
          PUTS "   [list $y]"
        }
        exit
      }

      -g {
        lappend ::EXTRACONFIG [lindex $argv $i]
      }

      -keep {
        set ::KEEPFILES 1
      }

      -with-tcl=* {
        set ::WITHTCL -$x
      }

      -D* -
      -O* -
      -enable-* -
      -disable-* -
      *=* {
        lappend ::EXTRACONFIG [lindex $argv $i]
      }

      default {
        PUTSERR ""
        PUTSERR [string trim $::USAGE_MESSAGE]
        exit -1
      }
    }
  }

  if {0==[info exists ::Platforms($platform)]} {
    PUTS "Unknown platform: $platform"
    PUTSNNL "Set the -platform option to "
    set print [list]
    foreach p [array names ::Platforms] {
      lappend print "\"$p\""
    }
    lset print end "or [lindex $print end]"
    PUTS "[join $print {, }]."
    exit
  }

  if {$config!=""} {
    if {[llength $config]==1} {lappend config fulltest}
    set ::CONFIGLIST $config
  } else {
    if {$::JOBS>1} {
      set ::CONFIGLIST {}
      foreach {target zConfig} [lreverse $::Platforms($platform)] {
        append ::CONFIGLIST [format "    %-25s %s\n" \
                               [list $zConfig] [list $target]]
      }
    } else {
      set ::CONFIGLIST $::Platforms($platform)
    }
  }
  PUTS "Running the following test configurations for $platform:"
  PUTS "    [string trim $::CONFIGLIST]"
  PUTSNNL "Flags:"
  if {$::PROGRESS_MSGS} {PUTSNNL " --progress"}
  if {$::DRYRUN} {PUTSNNL " --dryrun"}
  if {$::BUILDONLY} {PUTSNNL " --buildonly"}
  if {$::MSVC} {PUTSNNL " --msvc"}
  switch -- $::QUICK {
     1 {PUTSNNL " --quick"}
     2 {PUTSNNL " --veryquick"}
  }
  if {$::JOBS>1} {PUTSNNL " --jobs $::JOBS"}
  PUTS ""
}

# Check to see if there are uncommitted changes in the SQLite source
# checkout.  Exit if there are.  Except:  Do nothing if the --force
# flag is used.  Also, ignore this test if the fossil binary is
# unavailable, or if the source tree is not a valid fossil checkout.
#
proc check_uncommitted {} {
  if {$::FORCE} return
  set pwd [pwd]
  cd $::SRCDIR
  if {[catch {exec fossil changes} res]==0 && [string trim $res]!=""} {
    puts "ERROR: The check-out contains uncommitted changes:"
    puts $res
    puts "Use the -f or --force options to override"
    exit 1
  }
  cd $pwd
}

# A test run has just finished in directory $dir. This command deletes all
# non-essential files from the directory. Specifically, everything except
#
#   * The "testfixture" and "sqlite3" binaries,
#   * The "test-out.log" and "test.log" log files.
#
proc cleanup {dir} {
  set K(testfixture) 1
  set K(testfixture.exe) 1
  set K(sqlite3) 1
  set K(sqlite3.exe) 1
  set K(test-out.txt) 1
  set K(test.log) 1

  foreach f [glob -nocomplain [file join $dir *]] {
    set tail [file tail $f]
    if {[info exists K($tail)]==0} { 
      file delete -force $f
    }
  }
}


# Main routine.
#
proc main {argv} {

  # Process any command line options.
  set ::EXTRACONFIG {}
  process_options $argv
  if {!$::DRYRUN} check_uncommitted
  PUTS [string repeat * 79]

  set ::NERR 0
  set ::NTEST 0
  set ::NTESTCASE 0
  set ::NERRCASE 0
  set ::SQLITE_VERSION {}
  set STARTTIME [clock seconds]
  foreach {zConfig target} $::CONFIGLIST {
    if {$::MSVC && ($zConfig eq "Sanitize" || "checksymbols" in $target
           || "valgrindtest" in $target)} {
      PUTS "Skipping $zConfig / $target for MSVC..."
      continue
    }
    if {$target ne "checksymbols"} {
      switch -- $::QUICK {
         1 {set target quicktest}
         2 {set target smoketest}
      }
      if {$::BUILDONLY} {
        set target testfixture
        if {$::tcl_platform(platform)=="windows"} {
          append target .exe
        }
      }
    }
    set config_options [concat $::Configs($zConfig) $::EXTRACONFIG]

    incr NTEST
    add_test_suite all $zConfig $target $config_options

    # If the configuration included the SQLITE_DEBUG option, then remove
    # it and run veryquick.test. If it did not include the SQLITE_DEBUG option
    # add it and run veryquick.test.
    if {$target!="checksymbols" && $target!="valgrindtest"
           && $target!="fuzzoomtest" && !$::BUILDONLY && $::QUICK<2} {
      set debug_idx [lsearch -glob $config_options -DSQLITE_DEBUG*]
      set xtarget $target
      regsub -all {fulltest[a-z]*} $xtarget test xtarget
      regsub -all {fuzzoomtest} $xtarget fuzztest xtarget
      if {$debug_idx < 0} {
        incr NTEST
        append config_options " -DSQLITE_DEBUG=1 -DSQLITE_EXTRA_IFNULLROW=1"
        add_test_suite all "${zConfig}_debug" $xtarget $config_options
      } else {
        incr NTEST
        regsub { *-DSQLITE_MEMDEBUG[^ ]* *} $config_options { } config_options
        regsub { *-DSQLITE_DEBUG[^ ]* *} $config_options { } config_options
        add_test_suite all "${zConfig}_ndebug" $xtarget $config_options
      }
    }
  }

  run_all_test_suites $all

  set elapsetime [expr {[clock seconds]-$STARTTIME}]
  set hr [expr {$elapsetime/3600}]
  set min [expr {($elapsetime/60)%60}]
  set sec [expr {$elapsetime%60}]
  set etime [format (%02d:%02d:%02d) $hr $min $sec]
  if {$::JOBS>1} {append etime " $::JOBS cores"}
  if {[catch {exec hostname} HNAME]==0} {append etime " on $HNAME"}
  PUTS [string repeat * 79]
  incr ::NERRCASE $::NERR
  PUTS "$::NERRCASE failures out of $::NTESTCASE tests in $etime"
  if {$::SQLITE_VERSION ne ""} {
    PUTS "SQLite $::SQLITE_VERSION"
  }
}

main $argv
