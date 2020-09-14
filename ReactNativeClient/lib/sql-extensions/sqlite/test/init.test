# 2001 September 15
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
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the effects of a failure in 
# sqlite3_initialize().
#
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
if {[db eval {SELECT sqlite_compileoption_used('THREADSAFE=0')}]} {
  finish_test
  return
}

db close

foreach {t failed rc started} {
  1.1 {}       SQLITE_OK    {mutex mem pcache}
  1.2 {mutex}  SQLITE_ERROR {}
  1.3 {mem}    SQLITE_ERROR {mutex}
  1.4 {pcache} SQLITE_ERROR {mutex mem}
} {
  do_test init-$t.1 {
    eval init_wrapper_install $failed
    sqlite3_initialize
  } $rc
  do_test init-$t.2 {
    init_wrapper_query
  } $started
  do_test init-$t.3 {
    sqlite3_shutdown
    init_wrapper_query
  } {}
  do_test init-$t.4 {
    sqlite3_initialize
  } $rc
  do_test init-$t.5 {
    init_wrapper_query
  } $started
  do_test init-$t.6 {
    init_wrapper_clear
    sqlite3_initialize
  } SQLITE_OK
  do_test init-$t.7 {
    init_wrapper_query
  } {mutex mem pcache}
  do_test init-$t.8 {
    init_wrapper_uninstall
  } {}
}

source $testdir/malloc_common.tcl
if {$MEMDEBUG} {
  do_malloc_test init-2 -tclprep {
    db close
    init_wrapper_install
  } -tclbody {
    set rc [sqlite3_initialize]
    if {[string match "SQLITE*NOMEM" $rc]} {error "out of memory"}
  } -cleanup {
    set zRepeat "transient"
    if {$::iRepeat} {set zRepeat "persistent"}
    do_test init-2.$zRepeat.$::n.x {
      init_wrapper_clear
      sqlite3_initialize
    } SQLITE_OK
    init_wrapper_uninstall
  }
}

autoinstall_test_functions
finish_test
