# 2007 Aug 29
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
# This test script checks that tickets #2794, #2795, #2796, and #2797
# have been fixed.
# 
# $Id: mallocF.test,v 1.4 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocF tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# tickets #2794 and #2795 and #2797
#
set PREP {
  CREATE TABLE t1(x,y);
  INSERT INTO t1 VALUES('abc123', 5);
  INSERT INTO t1 VALUES('xyz987', 42);
}
do_malloc_test malloeF-1 -sqlprep $PREP -sqlbody {
  SELECT * FROM t1 WHERE x GLOB 'abc*'
}

# ticket #2796
#
set PREP {
  CREATE TABLE t1(x PRIMARY KEY,y UNIQUE);
  INSERT INTO t1 VALUES('abc123', 5);
  INSERT INTO t1 VALUES('xyz987', 42);
}
do_malloc_test malloeF-2 -sqlprep $PREP -sqlbody {
  SELECT x FROM t1
   WHERE y=1 OR y=2 OR y=3 OR y=4 OR y=5
      OR y=6 OR y=7 OR y=8 OR y=9 OR y=10
      OR y=11 OR y=12 OR y=13 OR y=14 OR y=15
      OR y=x
}

set PREP {
  CREATE TABLE t1(x PRIMARY KEY,y UNIQUE);
  INSERT INTO t1 VALUES('abc123', 5);
  INSERT INTO t1 VALUES('xyz987', 42);
}
do_malloc_test malloeF-3 -sqlprep $PREP -sqlbody {
  SELECT x FROM t1 WHERE y BETWEEN 10 AND 29
}

# Ticket #2843
#
set PREP {
  CREATE TABLE t1(x);
  CREATE TRIGGER r1 BEFORE INSERT ON t1 BEGIN
    SELECT 'hello';
  END;
}
do_malloc_test mallocF-4 -sqlprep $PREP -sqlbody {
  INSERT INTO t1 VALUES(random());
}

finish_test
