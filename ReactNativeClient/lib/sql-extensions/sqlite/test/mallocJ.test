# 2008 August 01
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
# This test script checks malloc failures in LIMIT operations for 
# UPDATE/DELETE statements.
# 
# $Id: mallocJ.test,v 1.6 2009/01/09 02:49:32 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

ifcapable {update_delete_limit} {

  do_malloc_test mallocJ-1 -sqlprep {
    DROP TABLE IF EXISTS t1;
    CREATE TABLE t1(x int, y int);
    INSERT INTO t1 VALUES(1,1);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(2,1);
    INSERT INTO t1 VALUES(2,2);
    INSERT INTO t1 VALUES(2,3);
  } -sqlbody {
    UPDATE t1 SET x=1 ORDER BY y LIMIT 2 OFFSET 2;
    UPDATE t1 SET x=2 WHERE y=1 ORDER BY y LIMIT 2 OFFSET 2;
    DELETE FROM t1 WHERE x=1 ORDER BY y LIMIT 2 OFFSET 2;
    DELETE FROM t1 ORDER BY y LIMIT 2 OFFSET 2;
  }

}

# ticket #3467
do_malloc_test mallocJ-2 -sqlprep {
  CREATE TABLE t1(a,b);
  INSERT INTO t1 VALUES(1,2);
  PRAGMA vdbe_trace=ON;
} -sqlbody {
  SELECT a, b, 'abc' FROM t1
    UNION
    SELECT b, a, 'xyz' FROM t1
    ORDER BY 2, 3;
}

# ticket #3478
do_malloc_test mallocJ-3 -sqlbody {
  EXPLAIN COMMIT
}

# ticket #3485
do_malloc_test mallocJ-4 -sqlprep {
  CREATE TABLE t1(a,b,c);
  CREATE TABLE t2(x,y,z);
} -sqlbody {
  SELECT * FROM (SELECT a,b FROM t1 UNION ALL SELECT x, y FROM t2) ORDER BY 1
}

# coverage testing
do_malloc_test mallocJ-5 -sqlprep {
  CREATE TABLE t1(["a"]);
} -sqlbody {
  SELECT * FROM t1
}

finish_test
