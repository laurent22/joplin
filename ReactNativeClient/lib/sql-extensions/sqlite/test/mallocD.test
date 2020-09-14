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
# $Id: mallocD.test,v 1.6 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocD tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

db close
sqlite3_simulate_device -char atomic
sqlite3 db test.db -vfs devsym

set PREP { 
  PRAGMA page_size = 1024;
  CREATE TABLE abc(a, b, c);
}

do_malloc_test mallocD-1 -sqlprep $PREP -sqlbody { 
  INSERT INTO abc VALUES(1, 2, 3);
}

do_malloc_test mallocD-2 -sqlprep $PREP -sqlbody {
  BEGIN;
  INSERT INTO abc VALUES(1, 2, 3);
  INSERT INTO abc VALUES(4, 5, 6);
  ROLLBACK;
}

do_malloc_test mallocD-3 -sqlprep $PREP -sqlbody {
  BEGIN;
  INSERT INTO abc VALUES(1, 2, 3);
  INSERT INTO abc VALUES(4, 5, randstr(1500,1500));
  COMMIT;
}

ifcapable attach {
  do_malloc_test mallocD-4 -sqlprep $PREP -sqlbody {
    ATTACH 'test2.db' AS aux;
    BEGIN;
    CREATE TABLE aux.def(d, e, f);
    INSERT INTO abc VALUES(4, 5, 6);
    COMMIT;
  }
}

sqlite3_simulate_device -char {}

finish_test
