# 2019 August 01
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file implements a program that produces scripts (either shell scripts
# or batch files) to implement a particular test that is part of the SQLite
# release testing procedure. For example, to run veryquick.test with a 
# specified set of -D compiler switches.
#
# A "configuration" is a set of options passed to [./configure] and [make]
# to build the SQLite library in a particular fashion. A "platform" is a
# list of tests; most platforms are named after the hardware/OS platform
# that the tests will be run on as part of the release procedure. Each 
# "test" is a combination of a configuration and a makefile target (e.g.
# "fulltest"). The program may be invoked as follows:
#
set USAGE {
$argv0 platforms
    List available platforms.

$argv0 tests ?-nodebug? PLATFORM
    List tests in a specified platform. If the -nodebug switch is 
    specified, synthetic debug/ndebug configurations are omitted. Each
    test is a combination of a configuration and a makefile target.

$argv0 script ?-msvc? CONFIGURATION TARGET
    Given a configuration and make target, return a bash (or, if -msvc
    is specified, batch) script to execute the test. The first argument
    passed to the script must be a directory containing SQLite source code.

$argv0 configurations
    List available configurations.
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
  }
  "Valgrind" {
    -DSQLITE_ENABLE_STAT4
    -DSQLITE_ENABLE_FTS4
    -DSQLITE_ENABLE_RTREE
    -DSQLITE_ENABLE_HIDDEN_COLUMNS
    --enable-json1
  }

  "Windows-Memdebug" {
    MEMDEBUG=1
    DEBUG=3
  }
  "Windows-Win32Heap" {
    WIN32HEAP=1
    DEBUG=4
  }

  # The next group of configurations are used only by the
  # Failure-Detection platform.  They are all the same, but we need
  # different names for them all so that they results appear in separate
  # subdirectories.
  #
  Fail0     {-O0}
  Fail2     {-O0}
  Fail3     {-O0}
  Fail4     {-O0}
  FuzzFail1 {-O0}
  FuzzFail2 {-O0}
}]
if {$tcl_platform(os)=="Darwin"} {
  lappend Configs(Apple -DSQLITE_ENABLE_LOCKING_STYLE=1
}

array set ::Platforms [strip_comments {
  Linux-x86_64 {
    "Check-Symbols*"          checksymbols
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
    "Valgrind*"               valgrindtest
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
    "Windows-Memdebug*"       test
    "Windows-Win32Heap*"      test
    "Default"                 "mptest fulltestonly"
  }
  "Windows NT-amd64" {
    "Stdcall"                 test
    "Have-Not"                test
    "Windows-Memdebug*"       test
    "Windows-Win32Heap*"      test
    "Default"                 "mptest fulltestonly"
  }

  # The Failure-Detection platform runs various tests that deliberately
  # fail.  This is used as a test of this script to verify that this script
  # correctly identifies failures.
  #
  Failure-Detection {
    Fail0*     "TEST_FAILURE=0 test"
    Sanitize*  "TEST_FAILURE=1 test"
    Fail2*     "TEST_FAILURE=2 valgrindtest"
    Fail3*     "TEST_FAILURE=3 valgrindtest"
    Fail4*     "TEST_FAILURE=4 test"
    FuzzFail1* "TEST_FAILURE=5 test"
    FuzzFail2* "TEST_FAILURE=5 valgrindtest"
  }
}]

# Configuration verification: Check that each entry in the list of configs
# specified for each platforms exists.
#
foreach {key value} [array get ::Platforms] {
  foreach {v t} $value {
    if {[string range $v end end]=="*"} {
      set v [string range $v 0 end-1]
    }
    if {0==[info exists ::Configs($v)]} {
      puts stderr "No such configuration: \"$v\""
      exit -1
    }
  }
}

proc usage {} {
  global argv0
  puts stderr [subst $::USAGE]
  exit 1
}

proc is_prefix {p str min} {
  set n [string length $p]
  if {$n<$min} { return 0 }
  if {[string range $str 0 [expr $n-1]]!=$p} { return 0 }
  return 1
}

proc main_configurations {} {
  foreach k [lsort [array names ::Configs]] {
    puts $k
  }
}

proc main_platforms {} {
  foreach k [lsort [array names ::Platforms]] {
    puts "\"$k\""
  }
}

proc main_script {args} {
  set bMsvc 0
  set nArg [llength $args]
  if {$nArg==3} {
    if {![is_prefix [lindex $args 0] -msvc 2]} usage
    set bMsvc 1
  } elseif {$nArg<2 || $nArg>3} {
    usage
  }
  set config [lindex $args end-1]
  set target [lindex $args end]

  set opts       [list]                         ;# OPTS value
  set cflags     [expr {$bMsvc ? "-Zi" : "-g"}] ;# CFLAGS value
  set makeOpts   [list]                         ;# Extra args for [make]
  set configOpts [list]                         ;# Extra args for [configure]

  if {$::tcl_platform(platform)=="windows" || $bMsvc} {
    lappend opts -DSQLITE_OS_WIN=1
  } else {
    lappend opts -DSQLITE_OS_UNIX=1
  }

  # Figure out if this is a synthetic ndebug or debug configuration.
  #
  set bRemoveDebug 0
  if {[string match *-ndebug $config]} {
    set bRemoveDebug 1
    set config [string range $config 0 end-7]
  }
  if {[string match *-debug $config]} {
    lappend opts -DSQLITE_DEBUG
    lappend opts -DSQLITE_EXTRA_IFNULLROW
    set config [string range $config 0 end-6]
  }

  # Ensure that the named configuration exists.
  #
  if {![info exists ::Configs($config)]} {
    puts stderr "No such config: $config"
    exit 1
  }

  # Loop through the parameters of the nominated configuration, updating
  # $opts, $cflags, $makeOpts and $configOpts along the way. Rules are as
  # follows:
  #
  #   1. If the parameter begins with a "*", discard it.
  #
  #   2. If $bRemoveDebug is set and the parameter is -DSQLITE_DEBUG or
  #      -DSQLITE_DEBUG=1, discard it
  #
  #   3. If the parameter begins with "-D", add it to $opts.
  #
  #   4. If the parameter begins with "--" add it to $configOpts. Unless
  #      this command is preparing a script for MSVC - then add an 
  #      equivalent to $makeOpts or $opts.
  #
  #   5. If the parameter begins with "-" add it to $cflags. If in MSVC
  #      mode and the parameter is an -O<integer> option, instead add
  #      an OPTIMIZATIONS=<integer> switch to $makeOpts.
  #
  #   6. If none of the above apply, add the parameter to $makeOpts
  #
  foreach param $::Configs($config) {
    if {[string range $param 0 0]=="*"} continue

    if {$bRemoveDebug} {
      if {$param=="-DSQLITE_DEBUG" || $param=="-DSQLITE_DEBUG=1"
       || $param=="-DSQLITE_MEMDEBUG" || $param=="-DSQLITE_MEMDEBUG=1"
      } {
        continue
      }
    }

    if {[string range $param 0 1]=="-D"} {
      lappend opts $param
      continue
    }

    if {[string range $param 0 1]=="--"} {
      if {$bMsvc} {
        switch -- $param {
          --disable-amalgamation {
            lappend makeOpts USE_AMALGAMATION=0
          }
          --disable-shared {
            lappend makeOpts USE_CRT_DLL=0 DYNAMIC_SHELL=0
          }
          --enable-fts5 {
            lappend opts -DSQLITE_ENABLE_FTS5
          } 
          --enable-json1 {
            lappend opts -DSQLITE_ENABLE_JSON1
          } 
          --enable-shared {
            lappend makeOpts USE_CRT_DLL=1 DYNAMIC_SHELL=1
          }
          --enable-session {
            lappend opts -DSQLITE_ENABLE_PREUPDATE_HOOK
            lappend opts -DSQLITE_ENABLE_SESSION
          }
          default {
            error "Cannot translate $param for MSVC"
          }
        }
      } else {
        lappend configOpts $param
      }

      continue
    }

    if {[string range $param 0 0]=="-"} {
      if {$bMsvc && [regexp -- {^-O(\d+)$} $param -> level]} {
        lappend makeOpts OPTIMIZATIONS=$level
      } else {
        lappend cflags $param
      }
      continue
    }

    lappend makeOpts $param
  }

  # Some configurations specify -DHAVE_USLEEP=0. For all others, add
  # -DHAVE_USLEEP=1.
  #
  if {[lsearch $opts "-DHAVE_USLEEP=0"]<0} {
    lappend opts -DHAVE_USLEEP=1
  }

  if {$bMsvc==0} {
    puts {set -e}
    puts {}
    puts {if [ "$#" -ne 1 ] ; then}
    puts {  echo "Usage: $0 <sqlite-src-dir>" }
    puts {  exit -1 }
    puts {fi }
    puts {SRCDIR=$1}
    puts {}
    puts "TCL=\"[::tcl::pkgconfig get libdir,install]\""

    puts "\$SRCDIR/configure --with-tcl=\$TCL $configOpts"
    puts {}
    puts {OPTS="      -DSQLITE_NO_SYNC=1"}
    foreach o $opts { 
      puts "OPTS=\"\$OPTS $o\"" 
    }
    puts {}
    puts "CFLAGS=\"$cflags\""
    puts {}
    puts "make $target \"CFLAGS=\$CFLAGS\" \"OPTS=\$OPTS\" $makeOpts"
  } else {

    puts {set SRCDIR=%1}
    set makecmd    "nmake /f %SRCDIR%\\Makefile.msc TOP=%SRCDIR% $target "
    append makecmd "\"CFLAGS=$cflags\" \"OPTS=$opts\" $makeOpts"

    puts "set TMP=%CD%"
    puts $makecmd
  }
}

proc main_tests {args} {
  set bNodebug 0
  set nArg [llength $args]
  if {$nArg==2} {
    if {[is_prefix [lindex $args 0] -nodebug 2]} {
      set bNodebug 1
    } elseif {[is_prefix [lindex $args 0] -debug 2]} {
      set bNodebug 0
    } else usage
  } elseif {$nArg==0 || $nArg>2} {
    usage
  }
  set p [lindex $args end]
  if {![info exists ::Platforms($p)]} {
    puts stderr "No such platform: $p"
    exit 1
  }

  foreach {config target} $::Platforms($p) {
    set bNosynthetic 0
    if {[string range $config end end]=="*"} {
      set bNosynthetic 1
      set config [string range $config 0 end-1]
    }
    puts "$config \"$target\""
    if {$bNodebug==0 && $bNosynthetic==0} {
      set iHas [string first SQLITE_DEBUG $::Configs($config)]
      set dtarget test
      if {$target=="tcltest"} {
        set dtarget tcltest
      }
      if {$iHas>=0} {
        puts "$config-ndebug \"$dtarget\""
      } else {
        puts "$config-debug \"$dtarget\""
      }
    }
  }
}

if {[llength $argv]==0} { usage }
set cmd [lindex $argv 0]
set n [expr [llength $argv]-1]
if {[string match ${cmd}* configurations] && $n==0} {
  main_configurations 
} elseif {[string match ${cmd}* script]} {
  main_script {*}[lrange $argv 1 end]
} elseif {[string match ${cmd}* platforms] && $n==0} {
  main_platforms
} elseif {[string match ${cmd}* tests]} {
  main_tests {*}[lrange $argv 1 end]
} else {
  usage
}


