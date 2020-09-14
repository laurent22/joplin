# 2009 March 30
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
# Ticket #3761:  Make sure that an incremental vacuum on an in-memory
# database can be rolled back.
#
# $Id: tkt3761.test,v 1.1 2009/03/31 02:54:40 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3761-1.1 {
  db close
  sqlite3 db :memory:
  db eval {
    PRAGMA auto_vacuum=INCREMENTAL;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(zeroblob(900));
    INSERT INTO t1 VALUES(zeroblob(900));
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    BEGIN;
    DELETE FROM t1 WHERE rowid%2;
    PRAGMA incremental_vacuum(4);
    ROLLBACK;
  }
  db eval {PRAGMA integrity_check}
} {ok}

finish_test
