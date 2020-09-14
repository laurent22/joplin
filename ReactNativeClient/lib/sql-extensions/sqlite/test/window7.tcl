# 2018 May 19
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

source [file join [file dirname $argv0] pg_common.tcl]

#=========================================================================

start_test window7 "2019 March 01"
ifcapable !windowfunc

execsql_test 1.0 {
  DROP TABLE IF EXISTS t3;
  CREATE TABLE t3(a INTEGER, b INTEGER);
  INSERT INTO t3 VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7), (8, 8), 
    (9, 9), (0, 10), (1, 11), (2, 12), (3, 13), (4, 14), (5, 15), (6, 16), 
    (7, 17), (8, 18), (9, 19), (0, 20), (1, 21), (2, 22), (3, 23), (4, 24), 
    (5, 25), (6, 26), (7, 27), (8, 28), (9, 29), (0, 30), (1, 31), (2, 32), 
    (3, 33), (4, 34), (5, 35), (6, 36), (7, 37), (8, 38), (9, 39), (0, 40), 
    (1, 41), (2, 42), (3, 43), (4, 44), (5, 45), (6, 46), (7, 47), (8, 48), 
    (9, 49), (0, 50), (1, 51), (2, 52), (3, 53), (4, 54), (5, 55), (6, 56), 
    (7, 57), (8, 58), (9, 59), (0, 60), (1, 61), (2, 62), (3, 63), (4, 64), 
    (5, 65), (6, 66), (7, 67), (8, 68), (9, 69), (0, 70), (1, 71), (2, 72), 
    (3, 73), (4, 74), (5, 75), (6, 76), (7, 77), (8, 78), (9, 79), (0, 80), 
    (1, 81), (2, 82), (3, 83), (4, 84), (5, 85), (6, 86), (7, 87), (8, 88), 
    (9, 89), (0, 90), (1, 91), (2, 92), (3, 93), (4, 94), (5, 95), (6, 96), 
    (7, 97), (8, 98), (9, 99), (0, 100);
}

execsql_test 1.1 {
  SELECT a, sum(b) FROM t3 GROUP BY a ORDER BY 1;
}

execsql_test 1.2 {
  SELECT a, sum(b) OVER (
    ORDER BY a GROUPS BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.3 {
  SELECT a, sum(b) OVER (
    ORDER BY a GROUPS BETWEEN 0 PRECEDING AND 0 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.4 {
  SELECT a, sum(b) OVER (
    ORDER BY a GROUPS BETWEEN 2 PRECEDING AND 2 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.5 {
  SELECT a, sum(b) OVER (
    ORDER BY a RANGE BETWEEN 0 PRECEDING AND 0 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.6 {
  SELECT a, sum(b) OVER (
    ORDER BY a RANGE BETWEEN 2 PRECEDING AND 2 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.7 {
  SELECT a, sum(b) OVER (
    ORDER BY a RANGE BETWEEN 2 PRECEDING AND 1 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

execsql_test 1.8.1 {
  SELECT a, sum(b) OVER (
    ORDER BY a RANGE BETWEEN 0 PRECEDING AND 1 FOLLOWING
  ) FROM t3 ORDER BY 1;
}
execsql_test 1.8.2 {
  SELECT a, sum(b) OVER (
    ORDER BY a DESC RANGE BETWEEN 0 PRECEDING AND 1 FOLLOWING
  ) FROM t3 ORDER BY 1;
}

finish_test

