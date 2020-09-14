# 2007 April 30
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file contains additional out-of-memory checks (see malloc.tcl).
#
# $Id: mallocA.test,v 1.8 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix mallocA

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocA tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# Construct a test database
#
forcedelete test.db.bu
db eval {
  CREATE TABLE t1(a COLLATE NOCASE,b,c);
  INSERT INTO t1 VALUES(1,2,3);
  INSERT INTO t1 VALUES(1,2,4);
  INSERT INTO t1 VALUES(2,3,4);
  CREATE INDEX t1i1 ON t1(a);
  CREATE INDEX t1i2 ON t1(b,c);
  CREATE TABLE t2(x,y,z);
}
db close
copy_file test.db test.db.bu

do_malloc_test mallocA-1 -testdb test.db.bu -sqlbody {
  ANALYZE
}
do_malloc_test mallocA-1.1 -testdb test.db.bu -sqlbody {
  ANALYZE t1
}
do_malloc_test mallocA-1.2 -testdb test.db.bu -sqlbody {
  ANALYZE main
}
do_malloc_test mallocA-1.3 -testdb test.db.bu -sqlbody {
  ANALYZE main.t1
}

ifcapable reindex {
  do_malloc_test mallocA-2 -testdb test.db.bu -sqlbody {
    REINDEX;
  }
  do_malloc_test mallocA-3 -testdb test.db.bu -sqlbody {
    REINDEX t1;
  }
  do_malloc_test mallocA-4 -testdb test.db.bu -sqlbody {
    REINDEX main.t1;
  }
  do_malloc_test mallocA-5 -testdb test.db.bu -sqlbody {
    REINDEX nocase;
  }
}

reset_db
sqlite3_db_config_lookaside db 0 0 0
do_execsql_test 6-prep {
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a, b);
  INSERT INTO t1 VALUES('abc', 'w'); -- rowid=1
  INSERT INTO t1 VALUES('abc', 'x'); -- rowid=2
  INSERT INTO t1 VALUES('abc', 'y'); -- rowid=3
  INSERT INTO t1 VALUES('abc', 'z'); -- rowid=4

  INSERT INTO t1 VALUES('def', 'w'); -- rowid=5
  INSERT INTO t1 VALUES('def', 'x'); -- rowid=6
  INSERT INTO t1 VALUES('def', 'y'); -- rowid=7
  INSERT INTO t1 VALUES('def', 'z'); -- rowid=8

  ANALYZE;
}

do_faultsim_test 6.1 -faults oom* -body {
  execsql { SELECT rowid FROM t1 WHERE a='abc' AND b='x' }
} -test {
  faultsim_test_result [list 0 2]
}
do_faultsim_test 6.2 -faults oom* -body {
  execsql { SELECT rowid FROM t1 WHERE a='abc' AND b<'y' }
} -test {
  faultsim_test_result [list 0 {1 2}]
}

do_execsql_test 7.0 {
  PRAGMA cache_size = 5;
}
do_faultsim_test 7 -faults oom-trans* -prep {
} -body {
  execsql {
    WITH r(x,y) AS (
      SELECT 1, randomblob(100)
      UNION ALL
      SELECT x+1, randomblob(100) FROM r
      LIMIT 1000
    )
    SELECT count(x), length(y) FROM r GROUP BY (x%5)
  }
} -test {
  set res [list 200 100 200 100 200 100 200 100 200 100]
  faultsim_test_result [list 0 $res]
}


# Ensure that no file descriptors were leaked.
do_test malloc-99.X {
  catch {db close}
  set sqlite_open_file_count
} {0}

forcedelete test.db.bu
finish_test
