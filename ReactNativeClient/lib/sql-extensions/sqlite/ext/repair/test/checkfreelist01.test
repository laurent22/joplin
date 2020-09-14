# 2017-10-11

set testprefix checkfreelist

do_execsql_test 1.0 {
  PRAGMA page_size=1024;
  CREATE TABLE t1(a, b);
}

do_execsql_test 1.2 { SELECT checkfreelist('main') } {ok}
do_execsql_test 1.3 {
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<10000
  )
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM s;
  DELETE FROM t1 WHERE rowid%3;
  PRAGMA freelist_count;
} {6726}

do_execsql_test 1.4 { SELECT checkfreelist('main') } {ok}
do_execsql_test 1.5 {
  WITH freelist_trunk(i, d, n) AS (
    SELECT 1, NULL, sqlite_readint32(data, 32) FROM sqlite_dbpage WHERE pgno=1
      UNION ALL
    SELECT n, data, sqlite_readint32(data) 
    FROM freelist_trunk, sqlite_dbpage WHERE pgno=n
  )
  SELECT i FROM freelist_trunk WHERE i!=1;
} {
  10009 9715 9343 8969 8595 8222 7847 7474 7102 6727 6354 5982 5608 5234
  4860 4487 4112 3740 3367 2992 2619 2247 1872 1499 1125 752 377 5
}

do_execsql_test 1.6 { SELECT checkfreelist('main') } {ok}

proc set_int {blob idx newval} {
  binary scan $blob I* ints
  lset ints $idx $newval
  binary format I* $ints
}
db func set_int set_int

proc get_int {blob idx} {
  binary scan $blob I* ints
  lindex $ints $idx
}
db func get_int get_int

do_execsql_test 1.7 {
  BEGIN;
    UPDATE sqlite_dbpage 
      SET data = set_int(data, 1, get_int(data, 1)-1) 
      WHERE pgno=4860;
    SELECT checkfreelist('main');
  ROLLBACK;
} {{free-list count mismatch: actual=6725 header=6726}}

do_execsql_test 1.8 {
  BEGIN;
    UPDATE sqlite_dbpage 
      SET data = set_int(data, 5, (SELECT * FROM pragma_page_count)+1)
      WHERE pgno=4860;
    SELECT checkfreelist('main');
  ROLLBACK;
} {{leaf page 10092 is out of range (child 3 of trunk page 4860)}}

do_execsql_test 1.9 {
  BEGIN;
    UPDATE sqlite_dbpage 
      SET data = set_int(data, 5, 0)
      WHERE pgno=4860;
    SELECT checkfreelist('main');
  ROLLBACK;
} {{leaf page 0 is out of range (child 3 of trunk page 4860)}}

do_execsql_test 1.10 {
  BEGIN;
    UPDATE sqlite_dbpage 
      SET data = set_int(data, get_int(data, 1)+1, 0)
      WHERE pgno=5;
    SELECT checkfreelist('main');
  ROLLBACK;
} {{leaf page 0 is out of range (child 247 of trunk page 5)}}

do_execsql_test 1.11 {
  BEGIN;
    UPDATE sqlite_dbpage 
      SET data = set_int(data, 1, 249)
      WHERE pgno=5;
    SELECT checkfreelist('main');
  ROLLBACK;
} {{leaf count out of range (249) on trunk page 5}}
