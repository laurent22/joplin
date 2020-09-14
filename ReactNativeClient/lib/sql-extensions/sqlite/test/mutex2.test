# 2008 July 7
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
# Test scripts for deliberate failures of mutex routines.
#
# $Id: mutex2.test,v 1.9 2008/10/07 15:25:49 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !mutex {
  finish_test
  return
}

# deinitialize
#
catch {db close}
sqlite3_reset_auto_extension
sqlite3_shutdown
install_mutex_counters 1

# Fix the mutex subsystem so that it will not initialize.  In other words,
# make it so that sqlite3_initialize() always fails.  
#
do_test mutex2-1.1 {
  set ::disable_mutex_init 10
  sqlite3_initialize
} {SQLITE_IOERR}
do_test mutex2-1.1 {
  set ::disable_mutex_init 7
  sqlite3_initialize
} {SQLITE_NOMEM}

proc utf16 {str} {
  set r [encoding convertto unicode $str]
  append r "\x00\x00"
  return $r
}

# Now that sqlite3_initialize() is failing, try to run various APIs that
# require that SQLite be initialized.  Verify that they fail.
#
do_test mutex2-2.1 {
  set ::disable_mutex_init 7
  set rc [catch {sqlite db test.db} msg]
  lappend rc $msg
} {1 {}}
ifcapable utf16 {
  do_test mutex2-2.2 {
    set db2 [sqlite3_open16 [utf16 test.db] {}]
  } {0}
  do_test mutex2-2.3 {
    sqlite3_complete16 [utf16 {SELECT * FROM t1;}]
  } {7}
}
do_test mutex2-2.4 {
  sqlite3_mprintf_int {This is a test %d,%d,%d} 1 2 3
} {}
ifcapable load_ext {
  do_test mutex2-2.5 {
    sqlite3_auto_extension_sqr
  } {7}
}
do_test mutex2-2.6 {
  sqlite3_reset_auto_extension
} {}
do_test mutex2-2.7 {
  sqlite3_malloc 10000
} {0}
do_test mutex2-2.8 {
  sqlite3_realloc 0 10000
} {0}
ifcapable threadsafe {
  do_test mutex2-2.9 {
    alloc_dealloc_mutex
  } {0}
}
do_test mutex2-2.10 {
  vfs_initfail_test
} {}

# Restore the system to a functional state
#
install_mutex_counters 0
set disable_mutex_init 0
autoinstall_test_functions

# Mutex allocation works now.
#

do_test mutex2-3.1 {
  set ptr [alloc_dealloc_mutex]
  expr {$ptr!=0}
} {1}


finish_test
