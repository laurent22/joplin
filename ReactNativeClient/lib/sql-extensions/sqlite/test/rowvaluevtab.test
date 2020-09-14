# 2018 October 14
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


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix rowvaluevtab

ifcapable !vtab {
  finish_test
  return
}

register_echo_module db

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, c);
  CREATE INDEX t1b ON t1(b);
  INSERT INTO t1 VALUES('one', 1, 1);
  INSERT INTO t1 VALUES('two', 1, 2);
  INSERT INTO t1 VALUES('three', 1, 3);
  INSERT INTO t1 VALUES('four', 2, 1);
  INSERT INTO t1 VALUES('five', 2, 2);
  INSERT INTO t1 VALUES('six', 2, 3);
  INSERT INTO t1 VALUES('seven', 3, 1);
  INSERT INTO t1 VALUES('eight', 3, 2);
  INSERT INTO t1 VALUES('nine', 3, 3);

  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<10000
  ) INSERT INTO t1 SELECT NULL, NULL, NULL FROM s;
  CREATE VIRTUAL TABLE e1 USING echo(t1);
}

proc do_vfilter4_test {tn sql expected} {
  set res [list]
  db eval "explain $sql" {
    if {$opcode=="VFilter"} {
      lappend res $p4
    }
  }
  uplevel [list do_test $tn [list set {} $res] [list {*}$expected]]
}

do_execsql_test 1.1 {
  SELECT a FROM e1 WHERE (b, c) = (2, 2)
} {five}
do_vfilter4_test 1.1f {
  SELECT a FROM e1 WHERE (b, c) = (?, ?)
} {{SELECT rowid, a, b, c FROM 't1' WHERE b = ?}}

do_execsql_test 1.2 {
  SELECT a FROM e1 WHERE (b, c) > (2, 2)
} {six seven eight nine}
do_vfilter4_test 1.2f {
  SELECT a FROM e1 WHERE (b, c) > (2, 2)
} {
  {SELECT rowid, a, b, c FROM 't1' WHERE b >= ?}
}

do_execsql_test 1.3 {
  SELECT a FROM e1 WHERE (b, c) >= (2, 2)
} {five six seven eight nine}
do_vfilter4_test 1.3f {
  SELECT a FROM e1 WHERE (b, c) >= (2, 2)
} {
  {SELECT rowid, a, b, c FROM 't1' WHERE b >= ?}
}

do_execsql_test 1.3 {
  SELECT a FROM e1 WHERE (b, c) BETWEEN (1, 2) AND (2, 3)
} {two three four five six}
do_vfilter4_test 1.3f {
  SELECT a FROM e1 WHERE (b, c) BETWEEN (1, 2) AND (2, 3)
} {
  {SELECT rowid, a, b, c FROM 't1' WHERE b >= ? AND b <= ?}
}

do_execsql_test 1.4 {
  SELECT a FROM e1 WHERE (b, c) IN ( VALUES(2, 2) )
} {five}
do_vfilter4_test 1.4f {
  SELECT a FROM e1 WHERE (b, c) IN ( VALUES(2, 2) )
} {{SELECT rowid, a, b, c FROM 't1' WHERE b = ?}}

finish_test
