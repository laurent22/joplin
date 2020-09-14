# 2017-10-11
#
set testprefix checkindex

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a);
  INSERT INTO t1 VALUES('one', 2);
  INSERT INTO t1 VALUES('two', 4);
  INSERT INTO t1 VALUES('three', 6);
  INSERT INTO t1 VALUES('four', 8);
  INSERT INTO t1 VALUES('five', 10);

  CREATE INDEX i2 ON t1(a DESC);
} {}

proc incr_index_check {idx nStep} {
  set Q {
    SELECT errmsg, current_key FROM incremental_index_check($idx, $after)
    LIMIT $nStep
  }

  set res [list]
  while {1} {
    unset -nocomplain current_key
    set res1 [db eval $Q]
    if {[llength $res1]==0} break
    set res [concat $res $res1]
    set after [lindex $res end]
  }

  return $res
}

proc do_index_check_test {tn idx res} {
  uplevel [list do_execsql_test $tn.1 "
    SELECT errmsg, current_key FROM incremental_index_check('$idx');
  " $res]

  uplevel [list do_test $tn.2 "incr_index_check $idx 1" [list {*}$res]]
  uplevel [list do_test $tn.3 "incr_index_check $idx 2" [list {*}$res]]
  uplevel [list do_test $tn.4 "incr_index_check $idx 5" [list {*}$res]]
}


do_execsql_test 1.2.1 {
  SELECT rowid, errmsg IS NULL, current_key FROM incremental_index_check('i1');
} {
  1 1 'five',5
  2 1 'four',4
  3 1 'one',1
  4 1 'three',3
  5 1 'two',2
}
do_execsql_test 1.2.2 {
  SELECT errmsg IS NULL, current_key, index_name, after_key, scanner_sql
    FROM incremental_index_check('i1') LIMIT 1;
} {
  1
  'five',5
  i1
  {}
  {SELECT (SELECT a IS i.i0 FROM 't1' AS t WHERE "rowid" COLLATE BINARY IS i.i1), quote(i0)||','||quote(i1) FROM (SELECT (a) AS i0, ("rowid" COLLATE BINARY) AS i1 FROM 't1' INDEXED BY 'i1' ORDER BY 1,2) AS i}
}

do_index_check_test 1.3 i1 {
  {} 'five',5
  {} 'four',4
  {} 'one',1
  {} 'three',3
  {} 'two',2
}

do_index_check_test 1.4 i2 {
  {} 'two',2
  {} 'three',3
  {} 'one',1
  {} 'four',4
  {} 'five',5
}

do_test 1.5 {
  set tblroot [db one { SELECT rootpage FROM sqlite_master WHERE name='t1' }]
  sqlite3_imposter db main $tblroot {CREATE TABLE xt1(a,b)}
  db eval {
    UPDATE xt1 SET a='six' WHERE rowid=3;
    DELETE FROM xt1 WHERE rowid = 5;
  }
  sqlite3_imposter db main
} {}

do_index_check_test 1.6 i1 {
  {row missing} 'five',5
  {} 'four',4
  {} 'one',1
  {row data mismatch} 'three',3
  {} 'two',2
}

do_index_check_test 1.7 i2 {
  {} 'two',2
  {row data mismatch} 'three',3
  {} 'one',1
  {} 'four',4
  {row missing} 'five',5
}

#--------------------------------------------------------------------------
do_execsql_test 2.0 {

  CREATE TABLE t2(a INTEGER PRIMARY KEY, b, c, d);

  INSERT INTO t2 VALUES(1, NULL, 1, 1);
  INSERT INTO t2 VALUES(2, 1, NULL, 1);
  INSERT INTO t2 VALUES(3, 1, 1, NULL);

  INSERT INTO t2 VALUES(4, 2, 2, 1);
  INSERT INTO t2 VALUES(5, 2, 2, 2);
  INSERT INTO t2 VALUES(6, 2, 2, 3);

  INSERT INTO t2 VALUES(7, 2, 2, 1);
  INSERT INTO t2 VALUES(8, 2, 2, 2);
  INSERT INTO t2 VALUES(9, 2, 2, 3);

  CREATE INDEX i3 ON t2(b, c, d);
  CREATE INDEX i4 ON t2(b DESC, c DESC, d DESC);
  CREATE INDEX i5 ON t2(d, c DESC, b);
} {}

do_index_check_test 2.1 i3 {
  {} NULL,1,1,1 
  {} 1,NULL,1,2 
  {} 1,1,NULL,3 
  {} 2,2,1,4 
  {} 2,2,1,7 
  {} 2,2,2,5
  {} 2,2,2,8 
  {} 2,2,3,6 
  {} 2,2,3,9
}

do_index_check_test 2.2 i4 {
  {} 2,2,3,6 
  {} 2,2,3,9
  {} 2,2,2,5
  {} 2,2,2,8 
  {} 2,2,1,4 
  {} 2,2,1,7 
  {} 1,1,NULL,3 
  {} 1,NULL,1,2 
  {} NULL,1,1,1 
}

do_index_check_test 2.3 i5 {
  {} NULL,1,1,3 
  {} 1,2,2,4 
  {} 1,2,2,7 
  {} 1,1,NULL,1 
  {} 1,NULL,1,2 
  {} 2,2,2,5 
  {} 2,2,2,8 
  {} 3,2,2,6 
  {} 3,2,2,9
}

#--------------------------------------------------------------------------
do_execsql_test 3.0 {

  CREATE TABLE t3(w, x, y, z PRIMARY KEY) WITHOUT ROWID;
  CREATE INDEX t3wxy ON t3(w, x, y);
  CREATE INDEX t3wxy2 ON t3(w DESC, x DESC, y DESC);

  INSERT INTO t3 VALUES(NULL, NULL, NULL, 1);
  INSERT INTO t3 VALUES(NULL, NULL, NULL, 2);
  INSERT INTO t3 VALUES(NULL, NULL, NULL, 3);

  INSERT INTO t3 VALUES('a', NULL, NULL, 4);
  INSERT INTO t3 VALUES('a', NULL, NULL, 5);
  INSERT INTO t3 VALUES('a', NULL, NULL, 6);

  INSERT INTO t3 VALUES('a', 'b', NULL, 7);
  INSERT INTO t3 VALUES('a', 'b', NULL, 8);
  INSERT INTO t3 VALUES('a', 'b', NULL, 9);

} {}

do_index_check_test 3.1 t3wxy {
  {} NULL,NULL,NULL,1 {} NULL,NULL,NULL,2 {} NULL,NULL,NULL,3 
  {} 'a',NULL,NULL,4  {} 'a',NULL,NULL,5  {} 'a',NULL,NULL,6 
  {} 'a','b',NULL,7   {} 'a','b',NULL,8   {} 'a','b',NULL,9 
}
do_index_check_test 3.2 t3wxy2 {
  {} 'a','b',NULL,7   {} 'a','b',NULL,8   {} 'a','b',NULL,9 
  {} 'a',NULL,NULL,4  {} 'a',NULL,NULL,5  {} 'a',NULL,NULL,6 
  {} NULL,NULL,NULL,1 {} NULL,NULL,NULL,2 {} NULL,NULL,NULL,3 
}

#--------------------------------------------------------------------------
# Test with an index that uses non-default collation sequences.
#
do_execsql_test 4.0 {
  CREATE TABLE t4(a INTEGER PRIMARY KEY, c1 TEXT, c2 TEXT);
  INSERT INTO t4 VALUES(1, 'aaa', 'bbb');
  INSERT INTO t4 VALUES(2, 'AAA', 'CCC');
  INSERT INTO t4 VALUES(3, 'aab', 'ddd');
  INSERT INTO t4 VALUES(4, 'AAB', 'EEE');

  CREATE INDEX t4cc ON t4(c1 COLLATE nocase, c2 COLLATE nocase);
}

do_index_check_test 4.1 t4cc {
  {} 'aaa','bbb',1 
  {} 'AAA','CCC',2 
  {} 'aab','ddd',3 
  {} 'AAB','EEE',4
}

do_test 4.2 {
  set tblroot [db one { SELECT rootpage FROM sqlite_master WHERE name='t4' }]
  sqlite3_imposter db main $tblroot \
     {CREATE TABLE xt4(a INTEGER PRIMARY KEY, c1 TEXT, c2 TEXT)}

  db eval {
    UPDATE xt4 SET c1='hello' WHERE rowid=2;
    DELETE FROM xt4 WHERE rowid = 3;
  }
  sqlite3_imposter db main
} {}

do_index_check_test 4.3 t4cc {
  {} 'aaa','bbb',1 
  {row data mismatch} 'AAA','CCC',2 
  {row missing} 'aab','ddd',3 
  {} 'AAB','EEE',4
}

#--------------------------------------------------------------------------
# Test an index on an expression.
#
do_execsql_test 5.0 {
  CREATE TABLE t5(x INTEGER PRIMARY KEY, y TEXT, UNIQUE(y));
  INSERT INTO t5 VALUES(1, '{"x":1, "y":1}');
  INSERT INTO t5 VALUES(2, '{"x":2, "y":2}');
  INSERT INTO t5 VALUES(3, '{"x":3, "y":3}');
  INSERT INTO t5 VALUES(4, '{"w":4, "z":4}');
  INSERT INTO t5 VALUES(5, '{"x":5, "y":5}');

  CREATE INDEX t5x ON t5( json_extract(y, '$.x') );
  CREATE INDEX t5y ON t5( json_extract(y, '$.y') DESC );
}

do_index_check_test 5.1.1 t5x {
  {} NULL,4 {} 1,1 {} 2,2 {} 3,3 {} 5,5
}

do_index_check_test 5.1.2 t5y {
  {} 5,5 {} 3,3 {} 2,2 {} 1,1 {} NULL,4
}

do_index_check_test 5.1.3 sqlite_autoindex_t5_1 {
  {} {'{"w":4, "z":4}',4} 
  {} {'{"x":1, "y":1}',1} 
  {} {'{"x":2, "y":2}',2} 
  {} {'{"x":3, "y":3}',3} 
  {} {'{"x":5, "y":5}',5}
}

do_test 5.2 {
  set tblroot [db one { SELECT rootpage FROM sqlite_master WHERE name='t5' }]
  sqlite3_imposter db main $tblroot \
      {CREATE TABLE xt5(a INTEGER PRIMARY KEY, c1 TEXT);}
  db eval {
    UPDATE xt5 SET c1='{"x":22, "y":11}' WHERE rowid=1;
    DELETE FROM xt5 WHERE rowid = 4;
  }
  sqlite3_imposter db main
} {}

do_index_check_test 5.3.1 t5x {
  {row missing} NULL,4 
  {row data mismatch} 1,1 
  {} 2,2 
  {} 3,3 
  {} 5,5
}

do_index_check_test 5.3.2 sqlite_autoindex_t5_1 {
  {row missing} {'{"w":4, "z":4}',4} 
  {row data mismatch} {'{"x":1, "y":1}',1} 
  {} {'{"x":2, "y":2}',2} 
  {} {'{"x":3, "y":3}',3} 
  {} {'{"x":5, "y":5}',5}
}

#-------------------------------------------------------------------------
#
do_execsql_test 6.0 {
  CREATE TABLE t6(x INTEGER PRIMARY KEY, y, z);
  CREATE INDEX t6x1 ON t6(y, /* one,two,three */ z);
  CREATE INDEX t6x2 ON t6(z, -- hello,world,
  y);

  CREATE INDEX t6x3 ON t6(z -- hello,world
  , y);

  INSERT INTO t6 VALUES(1, 2, 3);
  INSERT INTO t6 VALUES(4, 5, 6);
}

do_index_check_test 6.1 t6x1 {
  {} 2,3,1 
  {} 5,6,4
}
do_index_check_test 6.2 t6x2 {
  {} 3,2,1 
  {} 6,5,4
}
do_index_check_test 6.2 t6x3 {
  {} 3,2,1 
  {} 6,5,4
}

#-------------------------------------------------------------------------
#
do_execsql_test 7.0 {
  CREATE TABLE t7(x INTEGER PRIMARY KEY, y, z);
  INSERT INTO t7 VALUES(1, 1, 1);
  INSERT INTO t7 VALUES(2, 2, 0);
  INSERT INTO t7 VALUES(3, 3, 1);
  INSERT INTO t7 VALUES(4, 4, 0);

  CREATE INDEX t7i1 ON t7(y) WHERE z=1;
  CREATE INDEX t7i2 ON t7(y) /* hello,world */ WHERE z=1;
  CREATE INDEX t7i3 ON t7(y) WHERE -- yep 
  z=1;
  CREATE INDEX t7i4 ON t7(y) WHERE z=1 -- yep;
}
do_index_check_test 7.1 t7i1 {
  {} 1,1 {} 3,3
}
do_index_check_test 7.2 t7i2 {
  {} 1,1 {} 3,3
}
do_index_check_test 7.3 t7i3 {
  {} 1,1 {} 3,3
}
do_index_check_test 7.4 t7i4 {
  {} 1,1 {} 3,3
}
