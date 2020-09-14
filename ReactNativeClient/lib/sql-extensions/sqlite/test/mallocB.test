# 2007 May 30
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
# These were all discovered by fuzzy generation of SQL. Apart from
# that they have little in common.
#
#
# $Id: mallocB.test,v 1.9 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocB tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}
source $testdir/malloc_common.tcl

do_malloc_test mallocB-1 -sqlbody {SELECT - 456}
do_malloc_test mallocB-2 -sqlbody {SELECT - 456.1}
do_malloc_test mallocB-3 -sqlbody {SELECT random()}
do_malloc_test mallocB-4 -sqlbody {SELECT length(zeroblob(1000))}
ifcapable subquery {
  do_malloc_test mallocB-5 -sqlbody {SELECT * FROM (SELECT 1) GROUP BY 1;}
}

# The following test checks that there are no resource leaks following a
# malloc() failure in sqlite3_set_auxdata().
#
# Note: This problem was not discovered by fuzzy generation of SQL. Not
# that it really matters.
#
do_malloc_test mallocB-6 -sqlbody { SELECT test_auxdata('hello world'); }

do_malloc_test mallocB-7 -sqlbody {
  SELECT strftime(hex(randomblob(50)) || '%Y', 'now')
}

finish_test
