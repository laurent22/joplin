# 2009 March 28
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
# Ticket #3762:  Make sure that an incremental vacuum that reduces the
# size of the database file such that if a pointer-map page is eliminated
# it can be correctly rolled back.
#
# That ticket #3762 has been fixed has already been verified by the
# savepoint6.test test script.  But this script is simplier and a
# redundant test never hurts.
#
# $Id: tkt3762.test,v 1.1 2009/03/31 00:50:36 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3762-1.1 {
  db eval {
    PRAGMA auto_vacuum=INCREMENTAL;
    PRAGMA page_size=1024;
    PRAGMA cache_size=10;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(zeroblob(900));
    INSERT INTO t1 VALUES(zeroblob(900));
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    INSERT INTO t1 SELECT x FROM t1;
    DELETE FROM t1 WHERE rowid>202;
    VACUUM;
    
    BEGIN;
    DELETE FROM t1 WHERE rowid IN (10,11,12) ;
    PRAGMA incremental_vacuum(10);
    UPDATE t1 SET x=zeroblob(900) WHERE rowid BETWEEN 100 AND 110;
    INSERT INTO t1 VALUES(zeroblob(39000));
    SELECT count(*) FROM t1;
    ROLLBACK;
  }
  db eval {PRAGMA integrity_check}
} {ok}

finish_test
