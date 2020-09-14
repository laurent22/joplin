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
# $Id: mallocH.test,v 1.2 2008/08/01 20:10:09 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Malloc failures in journaling of in-memory databases.
#
do_malloc_test mallocH-1 -tclprep {
  db close
  sqlite3 db :memory:
  db eval {
    CREATE TABLE t1(x UNIQUE, y);
    INSERT INTO t1 VALUES(1,2);
  }
} -sqlbody {
  INSERT INTO t1 SELECT x+1, y+100 FROM t1;
}

# Malloc failures while parsing a CASE expression.
#
do_malloc_test mallocH-2 -sqlbody {
   SELECT CASE WHEN 1 THEN 1 END;
}

# Malloc failures while parsing a EXISTS(SELECT ...)
#
do_malloc_test mallocH-3 -sqlbody {
   SELECT 3+EXISTS(SELECT * FROM sqlite_master);
}

# Malloc failures within the replace() function.
#
do_malloc_test mallocH-3 -sqlbody {
   SELECT replace('ababa','a','xyzzy');
}

# Malloc failures during EXPLAIN.
#
ifcapable explain {
  do_malloc_test mallocH-4 -sqlprep {
     CREATE TABLE abc(a PRIMARY KEY, b, c);
  } -sqlbody {
     EXPLAIN SELECT * FROM abc AS t2 WHERE rowid=1;
     EXPLAIN QUERY PLAN SELECT * FROM abc AS t2 WHERE rowid=1;
  }
}

# Malloc failure during integrity_check pragma.
#
do_malloc_test mallocH-5 -sqlprep {
   CREATE TABLE t1(a PRIMARY KEY, b UNIQUE);
   CREATE TABLE t2(x,y);
   INSERT INTO t1 VALUES(1,2);
   INSERT INTO t2 SELECT * FROM t1;
} -sqlbody {
   PRAGMA integrity_check;
}

finish_test
