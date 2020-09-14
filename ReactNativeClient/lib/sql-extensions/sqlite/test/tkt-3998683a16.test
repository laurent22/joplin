# 2010 September 30
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
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [3998683a16a7076e08f5585c1f4816414c8c653a] where in
# floating point values with a decimal point at the beginning or end
# of the mantissa are used.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-3998683a16.1 {
  db eval {
    CREATE TABLE t1(x, y REAL);
    INSERT INTO t1 VALUES(1, '1.0');
    INSERT INTO t1 VALUES(2, '.125');
    INSERT INTO t1 VALUES(3, '123.');
    INSERT INTO t1 VALUES(4, '123.e+2');
    INSERT INTO t1 VALUES(5, '.125e+3');
    INSERT INTO t1 VALUES(6, '123e4');
    INSERT INTO t1 VALUES(11, '  1.0');
    INSERT INTO t1 VALUES(12, '  .125');
    INSERT INTO t1 VALUES(13, '  123.');
    INSERT INTO t1 VALUES(14, '  123.e+2');
    INSERT INTO t1 VALUES(15, '  .125e+3');
    INSERT INTO t1 VALUES(16, '  123e4');
    INSERT INTO t1 VALUES(21, '1.0  ');
    INSERT INTO t1 VALUES(22, '.125  ');
    INSERT INTO t1 VALUES(23, '123.  ');
    INSERT INTO t1 VALUES(24, '123.e+2  ');
    INSERT INTO t1 VALUES(25, '.125e+3  ');
    INSERT INTO t1 VALUES(26, '123e4  ');
    SELECT x FROM t1 WHERE typeof(y)=='real' ORDER BY x;
  }
} {1 2 3 4 5 6 11 12 13 14 15 16 21 22 23 24 25 26}

finish_test
