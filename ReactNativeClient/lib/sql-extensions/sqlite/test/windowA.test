# 2019-08-30
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Test cases for RANGE BETWEEN and especially with NULLS LAST
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix windowA

ifcapable !windowfunc {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b CHAR(1), d FLOAT);
  INSERT INTO t1 VALUES
   (1, 'A', 5.4),
   (2, 'B', 5.55),
   (3, 'C', 8.0),
   (4, 'D', 10.25),
   (5, 'E', 10.26),
   (6, 'N', NULL),
   (7, 'N', NULL);
} {}

do_execsql_test 1.1 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN 2.50 PRECEDING AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 ED   \
  4 D 10.25 EDC  \
  3 C   8.0 EDC  \
  2 B  5.55 CBA  \
  1 A   5.4 BA   \
  6 N  NULL NN   \
  7 N  NULL NN   \
]

do_execsql_test 1.2 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN 2.50 PRECEDING AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN   \
  7 N  NULL NN   \
  5 E 10.26 ED   \
  4 D 10.25 EDC  \
  3 C   8.0 EDC  \
  2 B  5.55 CBA  \
  1 A   5.4 BA   \
]

do_execsql_test 1.3 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN 2.50 PRECEDING AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 EDCBANN  \
  4 D 10.25 EDCBANN  \
  3 C   8.0 EDCBANN  \
  2 B  5.55 CBANN    \
  1 A   5.4 BANN     \
  6 N  NULL NN       \
  7 N  NULL NN       \
]

do_execsql_test 1.4 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN 2.50 PRECEDING AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NNEDCBA  \
  7 N  NULL NNEDCBA  \
  5 E 10.26 EDCBA    \
  4 D 10.25 EDCBA    \
  3 C   8.0 EDCBA    \
  2 B  5.55 CBA      \
  1 A   5.4 BA       \
]

do_execsql_test 1.5 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN 2.50 PRECEDING AND CURRENT ROW)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 E    \
  4 D 10.25 ED   \
  3 C   8.0 EDC  \
  2 B  5.55 CB   \
  1 A   5.4 BA   \
  6 N  NULL NN   \
  7 N  NULL NN   \
]

do_execsql_test 1.6 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN 2.50 PRECEDING AND CURRENT ROW)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN   \
  7 N  NULL NN   \
  5 E 10.26 E    \
  4 D 10.25 ED   \
  3 C   8.0 EDC  \
  2 B  5.55 CB   \
  1 A   5.4 BA   \
]

do_execsql_test 2.1 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN UNBOUNDED PRECEDING AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 ED       \
  4 D 10.25 EDC      \
  3 C   8.0 EDC      \
  2 B  5.55 EDCBA    \
  1 A   5.4 EDCBA    \
  6 N  NULL EDCBANN  \
  7 N  NULL EDCBANN  \
]

do_execsql_test 2.2 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN UNBOUNDED PRECEDING AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN         \
  7 N  NULL NN         \
  5 E 10.26 NNED       \
  4 D 10.25 NNEDC      \
  3 C   8.0 NNEDC      \
  2 B  5.55 NNEDCBA    \
  1 A   5.4 NNEDCBA    \
]

do_execsql_test 2.3 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 EDCBANN  \
  4 D 10.25 EDCBANN  \
  3 C   8.0 EDCBANN  \
  2 B  5.55 EDCBANN  \
  1 A   5.4 EDCBANN  \
  6 N  NULL EDCBANN  \
  7 N  NULL EDCBANN  \
]

do_execsql_test 2.4 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NNEDCBA  \
  7 N  NULL NNEDCBA  \
  5 E 10.26 NNEDCBA  \
  4 D 10.25 NNEDCBA  \
  3 C   8.0 NNEDCBA  \
  2 B  5.55 NNEDCBA  \
  1 A   5.4 NNEDCBA  \
]

do_execsql_test 2.5 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 E        \
  4 D 10.25 ED       \
  3 C   8.0 EDC      \
  2 B  5.55 EDCB     \
  1 A   5.4 EDCBA    \
  6 N  NULL EDCBANN  \
  7 N  NULL EDCBANN  \
]

do_execsql_test 2.6 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN       \
  7 N  NULL NN       \
  5 E 10.26 NNE      \
  4 D 10.25 NNED     \
  3 C   8.0 NNEDC    \
  2 B  5.55 NNEDCB   \
  1 A   5.4 NNEDCBA  \
]


do_execsql_test 3.1 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN CURRENT ROW AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 ED       \
  4 D 10.25 DC       \
  3 C   8.0 C        \
  2 B  5.55 BA       \
  1 A   5.4 A        \
  6 N  NULL NN       \
  7 N  NULL NN       \
]

do_execsql_test 3.2 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN CURRENT ROW AND 2.25 FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN       \
  7 N  NULL NN       \
  5 E 10.26 ED       \
  4 D 10.25 DC       \
  3 C   8.0 C        \
  2 B  5.55 BA       \
  1 A   5.4 A        \
]

do_execsql_test 3.3 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS LAST
      RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS LAST, +a;
} [list \
  5 E 10.26 EDCBANN  \
  4 D 10.25 DCBANN   \
  3 C   8.0 CBANN    \
  2 B  5.55 BANN     \
  1 A   5.4 ANN      \
  6 N  NULL NN       \
  7 N  NULL NN       \
]

do_execsql_test 3.4 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NNEDCBA  \
  7 N  NULL NNEDCBA  \
  5 E 10.26 EDCBA    \
  4 D 10.25 DCBA     \
  3 C   8.0 CBA      \
  2 B  5.55 BA       \
  1 A   5.4 A        \
]

do_execsql_test 4.0 {
  SELECT a, b, quote(d), group_concat(b,'') OVER w1 FROM t1
  WINDOW w1 AS 
     (ORDER BY d DESC NULLS FIRST
      RANGE BETWEEN 2.50 PRECEDING AND 0.5 PRECEDING)
  ORDER BY +d DESC NULLS FIRST, +a;
} [list \
  6 N  NULL NN  \
  7 N  NULL NN  \
  5 E 10.26 {}  \
  4 D 10.25 {}  \
  3 C   8.0 ED  \
  2 B  5.55 C   \
  1 A   5.4 {}  \
]


finish_test
