# 2003 December 18
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
# $Id: thread1.test,v 1.8 2008/10/07 15:25:49 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Skip this whole file if the thread testing code is not enabled
#
if {[run_thread_tests]==0} { finish_test ; return }
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

# Interleave two threads on read access.  Then make sure a third
# thread can write the database.  In other words:
#
#    read-lock A
#    read-lock B
#    unlock A
#    unlock B
#    write-lock C
#
# At one point, the write-lock of C would fail on Linux. 
#
do_test thread1-1.2 {
  thread_create A test.db
  thread_create B test.db
  thread_create C test.db
  thread_compile A {SELECT a FROM t1}
  thread_step A
  thread_result A
} SQLITE_ROW
do_test thread1-1.3 {
  thread_argc A
} 1
do_test thread1-1.4 {
  thread_argv A 0
} 1
do_test thread1-1.5 {
  thread_compile B {SELECT b FROM t1}
  thread_step B
  thread_result B
} SQLITE_ROW
do_test thread1-1.6 {
  thread_argc B
} 1
do_test thread1-1.7 {
  thread_argv B 0
} abcdefgh
do_test thread1-1.8 {
  thread_finalize A
  thread_result A
} SQLITE_OK
do_test thread1-1.9 {
  thread_finalize B
  thread_result B
} SQLITE_OK
do_test thread1-1.10 {
  thread_compile C {CREATE TABLE t2(x,y)}
  thread_step C
  thread_result C
} SQLITE_DONE
do_test thread1-1.11 {
  thread_finalize C
  thread_result C
} SQLITE_OK
do_test thread1-1.12 {
  catchsql {SELECT name FROM sqlite_master}
  execsql {SELECT name FROM sqlite_master}
} {t1 t2}


#
# The following tests - thread1-2.* - test the following scenario:
#
# 1:  Read-lock thread A
# 2:  Read-lock thread B
# 3:  Attempt to write in thread C -> SQLITE_BUSY
# 4:  Check db write failed from main thread.
# 5:  Unlock from thread A.
# 6:  Attempt to write in thread C -> SQLITE_BUSY
# 7:  Check db write failed from main thread.
# 8:  Unlock from thread B.
# 9:  Attempt to write in thread C -> SQLITE_DONE
# 10: Finalize the write from thread C
# 11: Check db write succeeded from main thread.
#
do_test thread1-2.1 {
  thread_halt *
  thread_create A test.db
  thread_compile A {SELECT a FROM t1}
  thread_step A
  thread_result A
} SQLITE_ROW
do_test thread1-2.2 {
  thread_create B test.db
  thread_compile B {SELECT b FROM t1}
  thread_step B
  thread_result B
} SQLITE_ROW
do_test thread1-2.3 {
  thread_create C test.db
  thread_compile C {INSERT INTO t2 VALUES(98,99)}
  thread_step C
  thread_result C
  thread_finalize C
  thread_result C
} SQLITE_BUSY

do_test thread1-2.4 {
  execsql {SELECT * FROM t2}
} {}

do_test thread1-2.5 {
  thread_finalize A
  thread_result A
} SQLITE_OK
do_test thread1-2.6 {
  thread_compile C {INSERT INTO t2 VALUES(98,99)}
  thread_step C
  thread_result C
  thread_finalize C
  thread_result C
} SQLITE_BUSY
do_test thread1-2.7 {
  execsql {SELECT * FROM t2}
} {}
do_test thread1-2.8 {
  thread_finalize B
  thread_result B
} SQLITE_OK
do_test thread1-2.9 {
  thread_compile C {INSERT INTO t2 VALUES(98,99)}
  thread_step C
  thread_result C
} SQLITE_DONE
do_test thread1-2.10 {
  thread_finalize C
  thread_result C
} SQLITE_OK
do_test thread1-2.11 {
  execsql {SELECT * FROM t2}
} {98 99}

thread_halt *   
finish_test
