# 2011 March 9
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
# This file contains tests of the mem5 allocation subsystem.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !mem5 {
  finish_test
  return
}

# The tests in this file configure the lookaside allocator after a 
# connection is opened. This will not work if there is any "presql"
# configured (SQL run within the [sqlite3] wrapper in tester.tcl).
if {[info exists ::G(perm:presql)]} {
  finish_test
  return
}

do_test mem5-1.1 {
  catch {db close}
  sqlite3_shutdown
  sqlite3_config_heap 25000000 0
  sqlite3_config_lookaside 0 0
  sqlite3_initialize
} {SQLITE_OK}

# try with min request size = 2^30
do_test mem5-1.2 {
  catch {db close}
  sqlite3_shutdown
  sqlite3_config_heap 1 1073741824
  sqlite3_config_lookaside 0 0
  sqlite3_initialize
} {SQLITE_NOMEM}

# try with min request size = 2^30+1
# previously this was causing the memsys5Log() func to infinitely loop.
do_test mem5-1.3 {
  catch {db close}
  sqlite3_shutdown
  sqlite3_config_heap 1 1073741825
  sqlite3_config_lookaside 0 0
  sqlite3_initialize
} {SQLITE_NOMEM}

do_test mem5-1.4 {
  catch {db close}
  sqlite3_shutdown
  sqlite3_config_heap 0 0
  sqlite3_config_lookaside 0 0
  sqlite3_initialize
} {SQLITE_OK}

finish_test
