# 2007 Oct 3
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2767 has been fixed.
# Ticket #2767 is for a VDBE stack overflow on BEFORE
# triggers that run RAISE(IGNORE).
#
# $Id: tkt2767.test,v 1.3 2009/04/07 14:14:23 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !trigger { finish_test ; return }

do_test tkt2767-1.1 {
  execsql {
    -- Construct a table with many rows of data
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 SELECT x+2 FROM t1;
    INSERT INTO t1 SELECT x+4 FROM t1;
    INSERT INTO t1 SELECT x+8 FROM t1;
    INSERT INTO t1 SELECT x+16 FROM t1;

    -- BEFORE triggers that invoke raise(ignore).  The effect of
    -- these triggers should be to make INSERTs, UPDATEs, and DELETEs
    -- into no-ops.
    CREATE TRIGGER r1 BEFORE UPDATE ON t1 BEGIN
      SELECT raise(ignore);
    END;
    CREATE TRIGGER r2 BEFORE DELETE ON t1 BEGIN
      SELECT raise(ignore);
    END;
    CREATE TRIGGER r3 BEFORE INSERT ON t1 BEGIN
      SELECT raise(ignore);
    END;

    -- Verify the table content
    SELECT count(*), sum(x) FROM t1;
  }
} {32 528}

# Try to delete all elements of the table.  This will invoke the
# DELETE trigger 32 times, which should overflow the VDBE stack if
# the problem of #2767 is not fixed.  If the problem is fixed, all
# the deletes should be no-ops so the table should remain unchanged.
#
do_test tkt2767-1.2 {
  execsql {
    DELETE FROM t1 WHERE x>0;
    SELECT count(*), sum(x) FROM t1;
  }
} {32 528}

# Try to update all elements of the table.  This will invoke the
# UPDATE trigger 32 times, which should overflow the VDBE stack if
# the problem of #2767 is not fixed.  If the problem is fixed, all
# the updates should be no-ops so the table should remain unchanged.
#
do_test tkt2767-1.3 {
  execsql {
    UPDATE t1 SET x=x+1;
    SELECT count(*), sum(x) FROM t1;
  }
} {32 528}

# Invoke the insert trigger.  The insert trigger was working
# even prior to the fix of #2767.  But it seems good to go ahead
# and verify that it works.
#
do_test tkt2767-1.4 {
  execsql {
    INSERT INTO t1 SELECT x+32 FROM t1;
    SELECT count(*), sum(x) FROM t1;
  }
} {32 528}



finish_test
