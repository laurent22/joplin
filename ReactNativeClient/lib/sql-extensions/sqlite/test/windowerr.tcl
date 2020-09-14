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

start_test windowerr "2019 March 01"
ifcapable !windowfunc

execsql_test 1.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER, b INTEGER);
  INSERT INTO t1 VALUES(1, 1);
  INSERT INTO t1 VALUES(2, 2);
  INSERT INTO t1 VALUES(3, 3);
  INSERT INTO t1 VALUES(4, 4);
  INSERT INTO t1 VALUES(5, 5);
}

foreach {tn frame} {
  1 "ORDER BY a ROWS BETWEEN -1 PRECEDING AND 1 FOLLOWING"
  2 "ORDER BY a ROWS BETWEEN  1 PRECEDING AND -1 FOLLOWING"

  3 "ORDER BY a RANGE BETWEEN -1 PRECEDING AND 1 FOLLOWING"
  4 "ORDER BY a RANGE BETWEEN  1 PRECEDING AND -1 FOLLOWING"

  5 "ORDER BY a GROUPS BETWEEN -1 PRECEDING AND 1 FOLLOWING"
  6 "ORDER BY a GROUPS BETWEEN  1 PRECEDING AND -1 FOLLOWING"

  7 "ORDER BY a,b RANGE BETWEEN  1 PRECEDING AND 1 FOLLOWING"

  8 "PARTITION BY a RANGE BETWEEN  1 PRECEDING AND 1 FOLLOWING"
} {
  errorsql_test 1.$tn "
  SELECT a, sum(b) OVER (
    $frame
  ) FROM t1 ORDER BY 1
  "
}
errorsql_test 2.1 {
  SELECT sum( sum(a) OVER () ) FROM t1;
}

errorsql_test 2.2 {
  SELECT sum(a) OVER () AS xyz FROM t1 ORDER BY sum(xyz);
}

errorsql_test 3.0 {
  SELECT sum(a) OVER win FROM t1
  WINDOW win AS (ROWS BETWEEN 'hello' PRECEDING AND 10 FOLLOWING)
}
errorsql_test 3.2 {
  SELECT sum(a) OVER win FROM t1
  WINDOW win AS (ROWS BETWEEN 10 PRECEDING AND x'ABCD' FOLLOWING)
}

errorsql_test 3.3 {
  SELECT row_number(a) OVER () FROM t1;
}

finish_test

