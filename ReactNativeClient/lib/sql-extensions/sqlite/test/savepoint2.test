# 2008 December 15
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
# $Id: savepoint2.test,v 1.5 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl


# Tests in this file are quite similar to those run by trans.test and
# avtrans.test.
#

proc signature {} {
  return [db eval {SELECT count(*), md5sum(x) FROM t3}]
}

do_test savepoint2-1 {
  wal_set_journal_mode
  execsql {
    PRAGMA cache_size=10;
    BEGIN;
    CREATE TABLE t3(x TEXT);
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    COMMIT;
    SELECT count(*) FROM t3;
  }
} {1024}
wal_check_journal_mode savepoint2-1.1

unset -nocomplain ::sig
unset -nocomplain SQL

set iterations 20

set SQL(1) {
  DELETE FROM t3 WHERE random()%10!=0;
  INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
  INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
}
set SQL(2) {
  DELETE FROM t3 WHERE random()%10!=0;
  INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
  DELETE FROM t3 WHERE random()%10!=0;
  INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
} 
set SQL(3) {
  UPDATE t3 SET x = randstr(10, 400) WHERE random()%10;
  INSERT INTO t3 SELECT x FROM t3 WHERE random()%10;
  DELETE FROM t3 WHERE random()%10;
}
set SQL(4) {
  INSERT INTO t3 SELECT randstr(10,400) FROM t3 WHERE (random()%10 == 0);
}



for {set ii 2} {$ii < ($iterations+2)} {incr ii} {

  # Record the database signature. Optionally (every second run) open a
  # transaction. In all cases open savepoint "one", which may or may
  # not be a transaction savepoint, depending on whether or not a real
  # transaction has been opened.
  #
  do_test savepoint2-$ii.1 {
    if {$ii % 2} { execsql BEGIN }
    set ::sig(one) [signature]
    execsql "SAVEPOINT one"
  } {}

  # Execute some SQL on the database. Then rollback to savepoint "one".
  # Check that the database signature is as it was when "one" was opened.
  # 
  do_test savepoint2-$ii.2 {
    execsql $SQL(1)
    execsql "ROLLBACK to one"
    signature
  } $::sig(one)
  integrity_check savepoint2-$ii.2.1

  # Execute some SQL. Then open savepoint "two". Savepoint "two" is therefore
  # nested in savepoint "one".
  #
  do_test savepoint2-$ii.3 {
    execsql $SQL(1)
    set ::sig(two) [signature]
    execsql "SAVEPOINT two"
  } {}

  # More SQL changes. The rollback to savepoint "two". Check that the 
  # signature is as it was when savepoint "two" was opened.
  #
  do_test savepoint2-$ii.4 {
    execsql $SQL(2)
    execsql "ROLLBACK to two"
    signature
  } $::sig(two)
  integrity_check savepoint2-$ii.4.1

  # More SQL changes. The rollback to savepoint "two". Check that the 
  # signature is as it was when savepoint "two" was opened.
  #
  do_test savepoint2-$ii.5 {
    execsql $SQL(2)
    execsql "SAVEPOINT three"
    execsql $SQL(3)
    execsql "RELEASE three"
    execsql "ROLLBACK to one"
    signature
  } $::sig(one)

  # By this point the database is in the same state as it was at the 
  # top of the for{} loop (everything having been rolled back by the 
  # "ROLLBACK TO one" command above). So make a few changes to the 
  # database and COMMIT the open transaction, so that the next iteration
  # of the for{} loop works on a different dataset.
  # 
  # The transaction being committed here may have been opened normally using
  # "BEGIN", or may have been opened using a transaction savepoint created
  # by the "SAVEPOINT one" statement.
  #
  do_test savepoint2-$ii.6 {
    execsql $SQL(4)
    execsql COMMIT
    sqlite3_get_autocommit db
  } {1}
  integrity_check savepoint2-$ii.6.1

  # Check that the connection is still running in WAL mode.
  wal_check_journal_mode savepoint2-$ii.7
}

unset -nocomplain ::sig
unset -nocomplain SQL

finish_test
