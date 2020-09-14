# 2015 September 3
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
# This file is focused on OOM errors.
#

source [file join [file dirname [info script]] fts5_common.tcl]
source $testdir/malloc_common.tcl
set testprefix fts5fault9

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts5 {
  finish_test
  return
}

foreach_detail_mode $testprefix {

if {"%DETAIL%" != "none"} continue

fts5_aux_test_functions db

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts5(a, b, detail=%DETAIL%);
  INSERT INTO t1(t1, rank) VALUES('pgsz', 32);
  WITH seq(s) AS ( SELECT 1 UNION ALL SELECT s+1 FROM seq WHERE s<50)
  INSERT INTO t1 SELECT 'x x x y y y', 'a b c d e f' FROM seq;
}

do_faultsim_test 1 -faults oom-* -body {
  execsql { SELECT count(*) FROM t1('x AND y') }
} -test {
  faultsim_test_result {0 50}
}

do_execsql_test 2.0 {
  CREATE VIRTUAL TABLE t2 USING fts5(a, b, detail=%DETAIL%);
  INSERT INTO t2(t2, rank) VALUES('pgsz', 32);
  INSERT INTO t2 VALUES('abc cba', 'cba abc');
  INSERT INTO t2 VALUES('abc cba', 'cba abc');
  INSERT INTO t2 VALUES('abc cba', 'cba abc');

  INSERT INTO t2 VALUES('axy cyx', 'cyx axy');
  INSERT INTO t2 VALUES('axy cyx', 'cyx axy');
  INSERT INTO t2 VALUES('axy cyx', 'cyx axy');
}

do_faultsim_test 2 -faults oom-* -body {
  execsql { SELECT count(*) FROM t2('a* AND c*') }
} -test {
  faultsim_test_result {0 6}
}


do_execsql_test 3.0 {
  CREATE VIRTUAL TABLE t3 USING fts5(a, detail=%DETAIL%);
  INSERT INTO t3 VALUES('a x x a x a a a');
  INSERT INTO t3 VALUES('x a a x a x x x');
}

do_faultsim_test 3.1 -faults oom-* -body {
  execsql { SELECT highlight(t3, 0, '[', ']') FROM t3('a') }
} -test {
  faultsim_test_result {0 {{[a] x x [a] x [a] [a] [a]} {x [a] [a] x [a] x x x}}}
}

do_faultsim_test 3.2 -faults oom-t* -body {
  execsql { SELECT fts5_test_poslist2(t3) FROM t3('x') }
} -test {
  faultsim_test_result \
      {0 {{0.0.1 0.0.2 0.0.4} {0.0.0 0.0.3 0.0.5 0.0.6 0.0.7}}} \
      {1 SQLITE_NOMEM}
}

#-------------------------------------------------------------------------
# Test OOM injection with the xPhraseFirstColumn() API and a tokenizer
# uses query synonyms.
#
fts5_tclnum_register db
do_execsql_test 4.0 {
  CREATE VIRTUAL TABLE t4 USING fts5(x, y, z, detail=%DETAIL%, tokenize=tclnum);
  INSERT INTO t4 VALUES('one two three', '1 2 3', 'i ii iii');
  INSERT INTO t4 VALUES('1 2 3', 'i ii iii', 'one two three');
  INSERT INTO t4 VALUES('i ii iii', 'one two three', 'i ii iii');

  INSERT INTO t4 VALUES('a1 a2 a3', 'a4 a5 a6', 'a7 a8 a9');
  INSERT INTO t4 VALUES('b1 b2 b3', 'b4 b5 b6', 'b7 b8 b9');
  INSERT INTO t4 VALUES('c1 c2 c3', 'c4 c5 c6', 'c7 c8 c9');
}

do_faultsim_test 4.1 -faults oom-t* -body {
  execsql { SELECT rowid, fts5_test_collist(t4) FROM t4('2') }
} -test {
  faultsim_test_result \
      {0 {1 {0.0 0.1 0.2} 2 {0.0 0.1 0.2} 3 {0.0 0.1 0.2}}} \
      {1 SQLITE_NOMEM} {1 SQLITE_ERROR} {1 {SQL logic error}}
}

do_faultsim_test 4.2 -faults oom-t* -body {
  execsql { SELECT rowid, fts5_test_collist(t4) FROM t4('a5 OR b5 OR c5') }
} -test {
  faultsim_test_result \
      {0 {4 {0.0 0.1 0.2} 5 {1.0 1.1 1.2} 6 {2.0 2.1 2.2}}} \
      {1 SQLITE_NOMEM} {1 SQLITE_ERROR} {1 {SQL logic error}}
}


#-------------------------------------------------------------------------
# An OOM within an "ORDER BY rank" query.
#
db func rnddoc fts5_rnddoc 
do_execsql_test 5.0 {
  CREATE VIRTUAL TABLE xx USING fts5(x, y, detail=%DETAIL%);
  INSERT INTO xx VALUES ('def', 'abc ' || rnddoc(10));
  INSERT INTO xx VALUES ('def', 'abc abc' || rnddoc(9));
  INSERT INTO xx VALUES ('def', 'abc abc abc' || rnddoc(8));
} {}
faultsim_save_and_close

do_faultsim_test 5 -faults oom-* -prep {
  faultsim_restore_and_reopen
  execsql { SELECT * FROM xx }
} -body {
  execsql { SELECT rowid FROM xx('abc AND def') ORDER BY rank }
} -test {
  faultsim_test_result [list 0 {3 2 1}]
}

set doc [string repeat "xyz " 500]
do_execsql_test 6.0 {
  CREATE VIRTUAL TABLE yy USING fts5(y, detail=%DETAIL%);
  INSERT INTO yy(yy, rank) VALUES('pgsz', 64);
  INSERT INTO yy VALUES ($doc);
  INSERT INTO yy VALUES ('1 2 3');
  INSERT INTO yy VALUES ('xyz');
  UPDATE yy SET y = y WHERE rowid = 1;
  UPDATE yy SET y = y WHERE rowid = 1;
  UPDATE yy SET y = y WHERE rowid = 1;
  UPDATE yy SET y = y WHERE rowid = 1;
} {}

do_faultsim_test 6 -faults oom-* -body {
  execsql { SELECT rowid FROM yy('xyz') }
} -test {
  faultsim_test_result [list 0 {1 3}]
}


} ;# foreach_detail_mode...

finish_test
