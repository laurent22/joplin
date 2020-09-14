# 2006 January 14
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is multithreading behavior
#
# $Id: thread2.test,v 1.3 2008/10/07 15:25:49 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[run_thread_tests]==0} { finish_test ; return }

# Skip this whole file if the thread testing code is not enabled
#
if {[llength [info command thread_step]]==0 || [sqlite3 -has-codec]} {
  finish_test
  return
}

# Create some data to work with
#
do_test thread1-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,'abcdefgh');
    INSERT INTO t1 SELECT a+1, b||b FROM t1;
    INSERT INTO t1 SELECT a+2, b||b FROM t1;
    INSERT INTO t1 SELECT a+4, b||b FROM t1;
    SELECT count(*), max(length(b)) FROM t1;
  }
} {8 64}

# Use the thread_swap command to move the database connections between
# threads, then verify that they still work.
#
do_test thread2-1.2 {
  db close
  thread_create A test.db
  thread_create B test.db
  thread_swap A B
  thread_compile A {SELECT a FROM t1 LIMIT 1}
  thread_result A
} {SQLITE_OK}
do_test thread2-1.3 {
  thread_step A
  thread_result A
} {SQLITE_ROW}
do_test thread2-1.4 {
  thread_argv A 0
} {1}
do_test thread2-1.5 {
  thread_finalize A
  thread_result A
} {SQLITE_OK}
do_test thread2-1.6 {
  thread_compile B {SELECT a FROM t1 LIMIT 1}
  thread_result B
} {SQLITE_OK}
do_test thread2-1.7 {
  thread_step B
  thread_result B
} {SQLITE_ROW}
do_test thread2-1.8 {
  thread_argv B 0
} {1}
do_test thread2-1.9 {
  thread_finalize B
  thread_result B
} {SQLITE_OK}

# Swap them again.
#
do_test thread2-2.2 {
  thread_swap A B
  thread_compile A {SELECT a FROM t1 LIMIT 1}
  thread_result A
} {SQLITE_OK}
do_test thread2-2.3 {
  thread_step A
  thread_result A
} {SQLITE_ROW}
do_test thread2-2.4 {
  thread_argv A 0
} {1}
do_test thread2-2.5 {
  thread_finalize A
  thread_result A
} {SQLITE_OK}
do_test thread2-2.6 {
  thread_compile B {SELECT a FROM t1 LIMIT 1}
  thread_result B
} {SQLITE_OK}
do_test thread2-2.7 {
  thread_step B
  thread_result B
} {SQLITE_ROW}
do_test thread2-2.8 {
  thread_argv B 0
} {1}
do_test thread2-2.9 {
  thread_finalize B
  thread_result B
} {SQLITE_OK}
thread_halt A
thread_halt B

# Also important to halt the worker threads, which are using spin
# locks and eating away CPU cycles.
#
thread_halt *   
finish_test
