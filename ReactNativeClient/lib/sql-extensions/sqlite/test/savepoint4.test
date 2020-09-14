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
# $Id: savepoint4.test,v 1.7 2009/06/09 15:25:33 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !crashtest {
  finish_test
  return
}

proc signature {} {
  return [db eval {SELECT count(*), md5sum(x) FROM t1}]
}

set ITERATIONS 25                   ;# Number of iterations for savepoint4-1
set ITERATIONS2 13                  ;# Number of iterations for savepoint4-2
expr srand(0)

do_test savepoint4-1 {
  execsql {
    PRAGMA cache_size=10;
    BEGIN;
    CREATE TABLE t1(x TEXT);
    INSERT INTO t1 VALUES(randstr(10,400));
    INSERT INTO t1 VALUES(randstr(10,400));
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    COMMIT;
    SELECT count(*) FROM t1;
  }
} {1024}


unset -nocomplain ::sig

for {set ii 1} {$ii<=$ITERATIONS} {incr ii} {
  set ::sig [signature]

  for {set iDelay 1 ; set crashed 1} {$crashed} {incr iDelay} {

    do_test savepoint4-1.$ii.1.$iDelay {
      set ret [crashsql -delay $iDelay -file test.db-journal {
        PRAGMA cache_size = 20;
        SAVEPOINT one;
          DELETE FROM t1 WHERE random()%2==0;
          SAVEPOINT two;
            INSERT INTO t1 SELECT randstr(10,10)||x FROM t1;
           ROLLBACK TO two;
            UPDATE t1 SET x = randstr(10, 400) WHERE random()%10;
          RELEASE two;
        ROLLBACK TO one;
        RELEASE one;
      }]
      signature
    } $::sig

    set crashed [lindex $ret 0]
    integrity_check savepoint4-1.$ii.1.$iDelay.integrity
  }

  do_test savepoint4-1.$ii.2 {
    execsql {
      DELETE FROM t1 WHERE random()%10==0;
      INSERT INTO t1 SELECT randstr(10,10)||x FROM t1 WHERE random()%9==0;
    }
  } {}
}

do_test savepoint4-2 {
  execsql {
    PRAGMA cache_size=10;
    DROP TABLE IF EXISTS t1;
    BEGIN;
    CREATE TABLE t1(x TEXT);
    CREATE INDEX i1 ON t1(x);
    INSERT INTO t1 VALUES(randstr(10,400));
    INSERT INTO t1 VALUES(randstr(10,400));
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    INSERT INTO t1 SELECT randstr(10,400) FROM t1;
    COMMIT;
    SELECT count(*) FROM t1;
  }
} {256}

for {set ii 1} {$ii<=$ITERATIONS2} {incr ii} {
  set ::sig [signature]
  set file test.db-journal

  for {set iDelay 1 ; set crashed 1} {$crashed} {incr iDelay} {

    do_test savepoint4-2.$ii.1.$iDelay {

      set ret [crashsql -delay $iDelay -file $file {
        SAVEPOINT one;
          INSERT INTO t1 SELECT * FROM t1 WHERE rowid<50;
         ROLLBACK TO one;
          INSERT INTO t1 SELECT * FROM t1 WHERE rowid<50;
          SAVEPOINT two;
            DELETE FROM t1 WHERE (random()%10)==0;
            SAVEPOINT three;
              DELETE FROM t1 WHERE (random()%10)==0;
              SAVEPOINT four;
                DELETE FROM t1 WHERE (random()%10)==0;
          RELEASE two;

          SAVEPOINT three;
            UPDATE t1 SET x = substr(x||x, 12, 100000) WHERE (rowid%12)==0;
            SAVEPOINT four;
              UPDATE t1 SET x = substr(x||x, 14, 100000) WHERE (rowid%14)==0;
           ROLLBACK TO three;
            UPDATE t1 SET x = substr(x||x, 13, 100000) WHERE (rowid%13)==0;
          RELEASE three;

        DELETE FROM t1 WHERE rowid > (
          SELECT rowid FROM t1 ORDER BY rowid ASC LIMIT 1 OFFSET 256
        );
        RELEASE one;
      }]

      set crashed [lindex $ret 0]
      if {$crashed} {
        signature
      } else {
        set ::sig
      }
    } $::sig

    integrity_check savepoint4-2.$ii.1.$iDelay.integrity

    if {$crashed == 0 && $file == "test.db-journal"} {
      set crashed 1
      set iDelay 0
      set file test.db
      set ::sig [signature]
    }
  }

  do_test savepoint4-2.$ii.2 {
    execsql {
      DELETE FROM t1 WHERE random()%10==0;
      INSERT INTO t1 SELECT randstr(10,10)||x FROM t1 WHERE random()%9==0;
    }
  } {}
}

finish_test
