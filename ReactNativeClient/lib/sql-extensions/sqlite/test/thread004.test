# 2009 February 26
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
# $Id: thread004.test,v 1.3 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]

source $testdir/tester.tcl
if {[run_thread_tests]==0} { finish_test ; return }
ifcapable !shared_cache {
  finish_test
  return
}
if { [info commands sqlite3_table_column_metadata] eq "" } {
  finish_test
  return
}

# Use shared-cache mode for this test.
# 
db close
set ::enable_shared_cache [sqlite3_enable_shared_cache]
sqlite3_enable_shared_cache 1

# Create a table in database test.db
#
sqlite3 db test.db
do_test thread004-1.1 {
  execsql { CREATE TABLE t1(a, b, c) }
} {}

do_test thread004-1.2 {

  set ThreadOne {
    set iStart [clock_seconds]
    while {[clock_seconds]<$iStart+20} {
      set ::DB [sqlite3_open test.db]
      sqlite3_close $::DB
    }
  }
  set ThreadTwo {
    set ::DB [sqlite3_open test.db]
    set iStart [clock_seconds]
    set nErr 0
    while {[clock_seconds] <$iStart+20} {
      incr nErr [catch {sqlite3_table_column_metadata $::DB main t1 a}]
    }
    sqlite3_close $::DB
    set nErr
  }
  
  # Run two threads. The first thread opens and closes database test.db
  # repeatedly. Each time this happens, the in-memory schema used by
  # all connections to test.db is discarded.
  #
  # The second thread calls sqlite3_table_column_metadata() over and
  # over again. Each time it is called, the database schema is loaded
  # if it is not already in memory. At one point this was crashing.
  #
  unset -nocomplain finished
  thread_spawn finished(1) $thread_procs $ThreadOne
  thread_spawn finished(2) $thread_procs $ThreadTwo
  
  foreach t {1 2} {
    if {![info exists finished($t)]} { vwait finished($t) }
  }

  set finished(2)
} {0}
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
