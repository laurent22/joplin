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
# This test script checks malloc failures in various obscure operations.
# 
# $Id: mallocI.test,v 1.3 2009/08/10 04:26:39 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Malloc failures in a view.
#
do_malloc_test mallocI-1 -sqlprep {
  CREATE TABLE t1(a,b,c,d);
  CREATE VIEW v1 AS SELECT a*b, c*d FROM t1 ORDER BY b-d;
} -sqlbody {
  SELECT * FROM v1
}

# Malloc failure while trying to service a pragma on a TEMP database.
#
do_malloc_test mallocI-2 -sqlbody {
  PRAGMA temp.page_size
}

# Malloc failure while creating a table from a SELECT statement.
#
do_malloc_test mallocI-3 -sqlprep {
  CREATE TABLE t1(a,b,c);
} -sqlbody {
  CREATE TABLE t2 AS SELECT b,c FROM t1;
}

# This tests that a malloc failure that occurs while passing the schema
# does not result in a SHARED lock being left on the database file.
#
do_malloc_test mallocI-4 -tclprep {
  sqlite3 db2 test.db
  db2 eval {
    CREATE TABLE t1(a, b, c);
    CREATE TABLE t2(a, b, c);
  }
} -sqlbody {
  SELECT * FROM t1
} -cleanup {
  do_test mallocI-4.$::n.2 {
    # If this INSERT is possible then [db] does not hold a shared lock
    # on the database file.
    catchsql { INSERT INTO t1 VALUES(1, 2, 3) } db2
  } {0 {}}
  catch {db2 close}
}
catch { db2 close }

do_faultsim_test mallocI-5 -faults oom* -prep {
  catch { db close }
  sqlite3 db test.db
  sqlite3_db_config_lookaside db 0 0 0
} -body {
  db eval { Select CAST(1 AS blob) }
} -test {
  faultsim_test_result {0 1}
}


finish_test
