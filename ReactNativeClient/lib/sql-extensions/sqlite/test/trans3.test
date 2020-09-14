# 2008 November 3
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
# focus of this script is the response of COMMIT and ROLLBACK when
# statements are still pending.
#
# $Id: trans3.test,v 1.2 2008/11/05 16:37:35 drh Exp $
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl
unset -nocomplain ecode

do_test trans3-1.1 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 VALUES(3);
    SELECT * FROM t1;
  }
} {1 2 3}
do_test trans3-1.2 {
  db eval BEGIN
  db eval {INSERT INTO t1 VALUES(4);}
  set ::ecode {}
  set x [catch {
     db eval {SELECT * FROM t1 LIMIT 1} {
        if {[catch {db eval COMMIT} errmsg]} {
           set ::ecode [sqlite3_extended_errcode db]
           error $errmsg
        }
     }
  } errmsg]
  lappend x $errmsg
} {0 {}}
do_test trans3-1.3 {
  set ::ecode
} {}
do_test trans3-1.3.1 {
  sqlite3_get_autocommit db
} 1
do_test trans3-1.4 {
  db eval {SELECT * FROM t1}
} {1 2 3 4}
do_test trans3-1.5 {
  db eval {BEGIN; CREATE TABLE xyzzy(abc);}
  db eval {INSERT INTO t1 VALUES(5);}
  set ::ecode {}
  set x [catch {
     db eval {SELECT * FROM t1} {
        if {[catch {db eval ROLLBACK} errmsg]} {
           set ::ecode [sqlite3_extended_errcode db]
           error $errmsg
        }
     }
  } errmsg]
  lappend x $errmsg
} {1 {abort due to ROLLBACK}}
do_test trans3-1.6 {
  set ::ecode
} {}
do_test trans3-1.7 {
  db eval {SELECT * FROM t1}
} {1 2 3 4}
unset -nocomplain ecode

finish_test
