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
# This test script checks that tickets #2784 and #2789 have been fixed.
# 
# $Id: mallocE.test,v 1.3 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocE tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# ticket #2784
#
set PREP { 
  PRAGMA page_size = 1024;
  CREATE TABLE t1(a, b, c);
  CREATE TABLE t2(x, y, z);
}
do_malloc_test mallocE-1 -sqlprep $PREP -sqlbody { 
  SELECT p, q FROM (SELECT a+b AS p, b+c AS q FROM t1, t2 WHERE c>5)
              LEFT JOIN t2 ON p=x;
}

# Ticket #2789
#
do_malloc_test mallocE-2 -sqlprep $PREP -sqlbody { 
  SELECT x, y2 FROM (SELECT a+b AS x, b+c AS y2 FROM t1, t2 WHERE c>5)
              LEFT JOIN t2 USING(x) WHERE y2>11;
}


finish_test
