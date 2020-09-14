# 2014-10-11
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
# Test that ticket [ba7cbfaedc] has been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-ba7cbfaedc

do_execsql_test 1 {
  CREATE TABLE t1 (x, y);
  INSERT INTO t1 VALUES (3, 'a');
  INSERT INTO t1 VALUES (1, 'a'); 
  INSERT INTO t1 VALUES (2, 'b');
  INSERT INTO t1 VALUES (2, 'a');
  INSERT INTO t1 VALUES (3, 'b');
  INSERT INTO t1 VALUES (1, 'b'); 
}

do_execsql_test 1.1 {
  CREATE INDEX i1 ON t1(x, y);
}

foreach {n idx} {
  1 { CREATE INDEX i1 ON t1(x, y) }
  2 { CREATE INDEX i1 ON t1(x DESC, y) }
  3 { CREATE INDEX i1 ON t1(x, y DESC) }
  4 { CREATE INDEX i1 ON t1(x DESC, y DESC) }
} {
  catchsql { DROP INDEX i1 }
  execsql $idx
  foreach {tn q res} {
    1 "GROUP BY x, y ORDER BY x, y"            {1 a 1 b   2 a 2 b   3 a 3 b}
    2 "GROUP BY x, y ORDER BY x DESC, y"       {3 a 3 b   2 a 2 b   1 a 1 b}
    3 "GROUP BY x, y ORDER BY x, y DESC"       {1 b 1 a   2 b 2 a   3 b 3 a}
    4 "GROUP BY x, y ORDER BY x DESC, y DESC"  {3 b 3 a   2 b 2 a   1 b 1 a}
  } {
    do_execsql_test 1.$n.$tn "SELECT * FROM t1 $q" $res
  }
}

do_execsql_test 2.0 {
  drop table if exists t1;
  create table t1(id int);
  insert into t1(id) values(1),(2),(3),(4),(5);
  create index t1_idx_id on t1(id asc);
  select * from t1 group by id order by id;
  select * from t1 group by id order by id asc;
  select * from t1 group by id order by id desc;
} {
  1 2 3 4 5   1 2 3 4 5   5 4 3 2 1
}

finish_test
