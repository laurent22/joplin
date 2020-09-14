
set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

register_echo_module [sqlite3_connection_pointer db]

do_test tkt3871-1.1 {
  execsql {
    BEGIN;
    CREATE TABLE t1(a PRIMARY KEY, b UNIQUE);
  }
  for {set i 0} {$i < 500} {incr i} {
    execsql { INSERT INTO t1 VALUES($i, $i*$i) }
  }
  execsql COMMIT
  execsql { 
    CREATE VIRTUAL TABLE e USING echo(t1);
    SELECT count(*) FROM e;
  }
} {500}

do_test tkt3871-1.2 {
  execsql { SELECT * FROM e WHERE a = 1 OR a = 2 }
} {1 1 2 4}
do_test tkt3871-1.3 {
  set echo_module ""
  execsql { SELECT * FROM e WHERE a = 1 OR a = 2 }
  set echo_module
} [list \
  xFilter {SELECT rowid, a, b FROM 't1' WHERE a = ?} 1 \
  xFilter {SELECT rowid, a, b FROM 't1' WHERE a = ?} 2 \
]

do_test tkt3871-1.4 {
  execsql { SELECT * FROM e WHERE a = 1 OR a = 2 OR b = 9 }
} {1 1 2 4 3 9}
do_test tkt3871-1.5 {
  set echo_module ""
  execsql { SELECT * FROM e WHERE a = 1 OR a = 2 OR b = 9 }
  set echo_module
} [list \
  xFilter {SELECT rowid, a, b FROM 't1' WHERE a = ?} 1 \
  xFilter {SELECT rowid, a, b FROM 't1' WHERE a = ?} 2 \
  xFilter {SELECT rowid, a, b FROM 't1' WHERE b = ?} 9
]


finish_test
