# 2019 September 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. In particular,
# that problems related to ticket a7debbe0ad1 have been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-a7debbe0

foreach tn {1 2} {
  reset_db
  if {$tn==1} {
    # Disable the flattener
    optimization_control db query-flattener 0
  } else {
    # Enable the flattener
    optimization_control db query-flattener 1
  }

  do_execsql_test $tn.1.0 {
    CREATE TABLE t0(xyz INTEGER);
    INSERT INTO t0(xyz) VALUES(456);
    CREATE VIEW v2(a, B) AS 
        SELECT 'a', 'B' COLLATE NOCASE FROM t0;
    CREATE TABLE t2(a, B COLLATE NOCASE);
    INSERT INTO t2 VALUES('a', 'B');
    CREATE VIEW v3(a, B) AS
        SELECT 'a' COLLATE BINARY, 'B' COLLATE NOCASE FROM t0;

    CREATE VIEW v4(a, B) AS
        SELECT 'a', +CAST('B' COLLATE NOCASE AS TEXT) FROM t0;

    CREATE VIEW v5(a, B) AS
        SELECT 'a', ('B' COLLATE NOCASE) || '' FROM t0;
  }

  # Table t2 and views v2 through v5 should all be equivalent.
  do_execsql_test $tn.1.1.1 { SELECT a   >= B FROM t2;         } 1
  do_execsql_test $tn.1.1.2 { SELECT 'a' >= 'B' COLLATE NOCASE } 0
  do_execsql_test $tn.1.1.3 { SELECT a   >= B FROM v2          } 1
  do_execsql_test $tn.1.1.4 { SELECT a   >= B FROM v3          } 1
  do_execsql_test $tn.1.1.5 { SELECT a   >= B FROM v4          } 1
  do_execsql_test $tn.1.1.6 { SELECT a   >= B FROM v5          } 1

  do_execsql_test $tn.1.2.1 { SELECT B   < a FROM t2           } 0
  do_execsql_test $tn.1.2.2 { SELECT 'B' COLLATE NOCASE < 'a'  } 0
  do_execsql_test $tn.1.2.3 { SELECT B   < a FROM v2           } 0
  do_execsql_test $tn.1.2.4 { SELECT B   < a FROM v3           } 0
  do_execsql_test $tn.1.2.5 { SELECT a  < B FROM v4           } 0
  do_execsql_test $tn.1.2.6 { SELECT a  < B FROM v5           } 0

  #-------------------------------------------------------------------------
  do_execsql_test $tn.2.0 {
    CREATE TABLE t5(a, b COLLATE NOCASE);
    INSERT INTO t5 VALUES(1, 'XYZ');
  }

  # Result should be 0, as column "xyz" from the sub-query has implicit
  # collation sequence BINARY.
  do_execsql_test $tn.2.1 {
    SELECT xyz==b FROM ( SELECT a, 'xyz' AS xyz FROM t5 ), t5;
  } {0}

  # Result should be 1, as literal 'xyz' has no collation sequence, so
  # the comparison uses the implicit collation sequence of the RHS - NOCASE.
  do_execsql_test $tn.2.2 {
    SELECT 'xyz'==b FROM ( SELECT a, 'xyz' AS xyz FROM t5 ), t5;
  } {1}

  #-----------------------------------------------------------------------
  # The test case submitted with the ticket.
  #
  do_execsql_test $tn.3.0 {
    DROP TABLE t0;
    DROP VIEW v2;

    CREATE TABLE t0(c0);
    INSERT INTO t0(c0) VALUES('');
    CREATE VIEW v2(c0, c1) AS 
        SELECT 'B' COLLATE NOCASE, 'a' FROM t0 ORDER BY t0.c0;
    SELECT SUM(count) FROM (
      SELECT v2.c1 BETWEEN v2.c0 AND v2.c1 as count FROM v2
    );
  } 1

  # The result is 1, as the collation used is the implicit collation sequence
  # of v2.c1 - BINARY.
  do_execsql_test $tn.3.1 {
    SELECT v2.c1 BETWEEN v2.c0 AND v2.c1 as count FROM v2;
  } 1
}

finish_test
