# 2014-03-24
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
# Tests to verify that arithmetic operators do not change the type of
# input operands.  Ticket [a8a0d2996a]
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-a8a0d2996a

do_execsql_test 1.0 {
  CREATE TABLE t(x,y);
  INSERT INTO t VALUES('1','1');
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x+0 AND y=='1';
} {text text}
do_execsql_test 1.1 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x-0 AND y=='1';
} {text text}
do_execsql_test 1.2 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x*1 AND y=='1';
} {text text}
do_execsql_test 1.3 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x/1 AND y=='1';
} {text text}
do_execsql_test 1.4 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x%4 AND y=='1';
} {text text}

do_execsql_test 2.0 {
  UPDATE t SET x='1xyzzy';
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x+0 AND y=='1';
} {text text}
do_execsql_test 2.1 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x-0 AND y=='1';
} {text text}
do_execsql_test 2.2 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x*1 AND y=='1';
} {text text}
do_execsql_test 2.3 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x/1 AND y=='1';
} {text text}
do_execsql_test 2.4 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x%4 AND y=='1';
} {text text}


do_execsql_test 3.0 {
  UPDATE t SET x='1.0';
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x+0 AND y=='1';
} {text text}
do_execsql_test 3.1 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x-0 AND y=='1';
} {text text}
do_execsql_test 3.2 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x*1 AND y=='1';
} {text text}
do_execsql_test 3.3 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x/1 AND y=='1';
} {text text}
do_execsql_test 3.4 {
  SELECT typeof(x), typeof(y) FROM t WHERE 1=x%4 AND y=='1';
} {text text}

do_execsql_test 4.0 {
  SELECT 1+1.;
} {2.0}
do_execsql_test 4.1 {
  SELECT '1.23e64'/'1.0000e+62';
} {123.0}
do_execsql_test 4.2 {
  SELECT '100x'+'-2y';
} {98}
do_execsql_test 4.3 {
  SELECT '100x'+'4.5y';
} {104.5}
do_execsql_test 4.4 {
  SELECT '-9223372036854775807x'-'1x';
} {-9223372036854775808}
do_execsql_test 4.5 {
  SELECT '9223372036854775806x'+'1x';
} {9223372036854775807}
do_execsql_test 4.6 {
  SELECT '1234x'/'10y', '1234x'/'10.y', '1234x'/'1e1y';
} {123 123.4 123.4}

finish_test
