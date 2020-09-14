# 2006 February 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify that ticket #1667 has been
# fixed.  
#
#
# $Id: tkt1667.test,v 1.4 2009/02/05 17:00:54 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !autovacuum||!tclvar {
  finish_test
  return
}

db close
forcedelete test.db test.db-journal

# Set the pending byte offset such that the page it is on is
# the first autovacuum pointer map page in the file (assume a page 
# size of 1024).

set first_ptrmap_page   [expr 1024/5 + 3]
sqlite3_test_control_pending_byte [expr 1024 * ($first_ptrmap_page-1)]

sqlite3 db test.db

do_test tkt1667-1 {
  execsql {
    PRAGMA auto_vacuum = 1;
    BEGIN;
    CREATE TABLE t1(a, b);
  }
  for {set i 0} {$i < 500} {incr i} {
    execsql {
      INSERT INTO t1 VALUES($i, randstr(1000, 2000))
    }
  }
  execsql {
    COMMIT;
  }
} {}
for {set i 0} {$i < 500} {incr i} {
  do_test tkt1667-2.$i.1 {
    execsql {
      DELETE FROM t1 WHERE a = $i;
    }
  } {}
  integrity_check tkt1667-2.$i.2
}

do_test tkt1667-3 {
  execsql {
    BEGIN;
  }
  for {set i 0} {$i < 500} {incr i} {
    execsql {
      INSERT INTO t1 VALUES($i, randstr(1000, 2000))
    }
  }
  execsql {
    COMMIT;
  }
} {}
do_test tkt1667-4.1 {
  execsql {
    DELETE FROM t1;
  }
} {}
integrity_check tkt1667-4.2

finish_test
