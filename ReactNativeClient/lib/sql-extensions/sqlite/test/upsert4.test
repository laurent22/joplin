# 2018-04-17
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
# Test cases for UPSERT

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix upsert4

foreach {tn sql} {
  1 { CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c UNIQUE) }
  2 { CREATE TABLE t1(a INT PRIMARY KEY, b, c UNIQUE) }
  3 { CREATE TABLE t1(a INT PRIMARY KEY, b, c UNIQUE) WITHOUT ROWID}
} {
  reset_db
  execsql $sql

  do_execsql_test 1.$tn.0 {
    INSERT INTO t1 VALUES(1, NULL, 'one');
    INSERT INTO t1 VALUES(2, NULL, 'two');
    INSERT INTO t1 VALUES(3, NULL, 'three');
  }
  
  do_execsql_test 1.$tn.1 {
    INSERT INTO t1 VALUES(1, NULL, 'xyz') ON CONFLICT DO NOTHING;
    SELECT * FROM t1;
  } {
    1 {} one 2 {} two 3 {} three
  }
  
  do_execsql_test 1.$tn.2 {
    INSERT INTO t1 VALUES(4, NULL, 'two') ON CONFLICT DO NOTHING;
    SELECT * FROM t1;
  } {
    1 {} one 2 {} two 3 {} three
  }
  
  do_execsql_test 1.$tn.3 {
    INSERT INTO t1 VALUES(4, NULL, 'two') ON CONFLICT (c) DO UPDATE SET b = 1;
    SELECT * FROM t1;
  } {
    1 {} one 2 1 two 3 {} three
  }
  
  do_execsql_test 1.$tn.4 {
    INSERT INTO t1 VALUES(2, NULL, 'zero') ON CONFLICT (a) DO UPDATE SET b=2;
    SELECT * FROM t1;
  } {1 {} one 2 2 two 3 {} three}

  do_catchsql_test 1.$tn.5 {
    INSERT INTO t1 VALUES(2, NULL, 'zero') ON CONFLICT (a) 
      DO UPDATE SET c = 'one';
  } {1 {UNIQUE constraint failed: t1.c}}

  do_execsql_test 1.$tn.6 {
    SELECT * FROM t1;
  } {1 {} one 2 2 two 3 {} three}

  do_execsql_test 1.$tn.7 {
    INSERT INTO t1 VALUES(2, NULL, 'zero') ON CONFLICT (a) 
      DO UPDATE SET (b, c) = (SELECT 'x', 'y');
    SELECT * FROM t1;
  } {1 {} one 2 x y 3 {} three}

  do_execsql_test 1.$tn.8 {
    INSERT INTO t1 VALUES(1, NULL, NULL) ON CONFLICT (a) 
      DO UPDATE SET (c, a) = ('four', 4);
    SELECT * FROM t1 ORDER BY 1;
  } {2 x y 3 {} three 4 {} four}
}

#-------------------------------------------------------------------------
# Test target analysis.
#
set rtbl(0) {0 {}}
set rtbl(1) {/1 .*failed.*/}
set rtbl(2) {1 {ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint}}

foreach {tn sql} {
  1 { 
      CREATE TABLE xyz(a INTEGER PRIMARY KEY, b, c, d);
      CREATE UNIQUE INDEX xyz1 ON xyz(d, c, b COLLATE nocase);
  }

  2 { 
      CREATE TABLE xyz(a INT PRIMARY KEY, b, c, d);
      CREATE UNIQUE INDEX xyz1 ON xyz(d, c, b COLLATE nocase);
  }

  3 { 
      CREATE TABLE xyz(a INT PRIMARY KEY, b, c, d) WITHOUT ROWID;
      CREATE UNIQUE INDEX xyz1 ON xyz(d, c, b COLLATE nocase);
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 2.$tn.1 {
    INSERT INTO xyz VALUES(10, 1, 1, 'one');
  }


  foreach {tn2 oc res} {
    1 "ON CONFLICT (b COLLATE nocase, c, d) DO NOTHING"   0
    2 "ON CONFLICT (b, c, d) DO NOTHING"                  0
    3 "ON CONFLICT (b, c COLLATE nocase, d) DO NOTHING"   2
    4 "ON CONFLICT (a) DO NOTHING"                        1
    5 "ON CONFLICT DO NOTHING"                            0
    6 "ON CONFLICT (b, c, d) WHERE a!=0 DO NOTHING"       0
    7 "ON CONFLICT (d, c, c) WHERE a!=0 DO NOTHING"       2
    8 "ON CONFLICT (b COLLATE nocase, c COLLATE nocase, d) DO NOTHING"   2
    9 "ON CONFLICT (b, c, d) WHERE b==45 DO NOTHING"      0
  } {

    do_catchsql_test 2.$tn.2.$tn2 "
      INSERT INTO xyz VALUES(11, 1, 1, 'one') $oc
    " $rtbl($res)
  }

  do_execsql_test 2.$tn.3 {
    SELECT * FROM xyz;
  } {10 1 1 one}
}

foreach {tn sql} {
  1 {
    CREATE TABLE abc(a INTEGER PRIMARY KEY, x, y);
    CREATE UNIQUE INDEX abc1 ON abc(('x' || x) COLLATE nocase);
  }
  2 {
    CREATE TABLE abc(a INT PRIMARY KEY, x, y);
    CREATE UNIQUE INDEX abc1 ON abc(('x' || x) COLLATE nocase);
  }
  3 { 
    CREATE TABLE abc(a INT PRIMARY KEY, x, y) WITHOUT ROWID;
    CREATE UNIQUE INDEX abc1 ON abc(('x' || x) COLLATE nocase);
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 3.$tn.1 {
    INSERT INTO abc VALUES(1, 'one', 'two');
  }

  foreach {tn2 oc res} {
    1 "ON CONFLICT DO NOTHING"                             0
    2 "ON CONFLICT ('x' || x) DO NOTHING"                  0
    3 "ON CONFLICT (('x' || x) COLLATE nocase) DO NOTHING" 0
    4 "ON CONFLICT (('x' || x) COLLATE binary) DO NOTHING" 2
    5 "ON CONFLICT (x || 'x') DO NOTHING"                  2
    6 "ON CONFLICT ((('x' || x))) DO NOTHING"              0
  } {
    do_catchsql_test 3.$tn.2.$tn2 "
      INSERT INTO abc VALUES(2, 'one', NULL) $oc;
    " $rtbl($res)
  }

  do_execsql_test 3.$tn.3 {
    SELECT * FROM abc
  } {1 one two}
}

foreach {tn sql} {
  1 {
    CREATE TABLE abc(a INTEGER PRIMARY KEY, x, y);
    CREATE UNIQUE INDEX abc1 ON abc(x) WHERE y>0;
    CREATE UNIQUE INDEX abc2 ON abc(y) WHERE x='xyz' COLLATE nocase;
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 4.$tn.1 {
    INSERT INTO abc VALUES(1, 'one', 1);
    INSERT INTO abc VALUES(2, 'two', 2);
    INSERT INTO abc VALUES(3, 'xyz', 3);
    INSERT INTO abc VALUES(4, 'XYZ', 4);
  }

  foreach {tn2 oc res} {
    1 "ON CONFLICT DO NOTHING"                                 0
    2 "ON CONFLICT(x) WHERE y>0 DO NOTHING"                    0
    3 "ON CONFLICT(x) DO NOTHING"                              2
    4 "ON CONFLICT(x) WHERE y>=0 DO NOTHING"                   2
    5 "ON CONFLICT(y) WHERE x='xyz' COLLATE nocase DO NOTHING" 1
  } {
    do_catchsql_test 4.$tn.2.$tn2 "
      INSERT INTO abc VALUES(5, 'one', 10) $oc
    " $rtbl($res)
  }

  do_execsql_test 4.$tn.3 {
    SELECT * FROM abc
  } {1 one 1 2 two 2 3 xyz 3 4 XYZ 4}

  foreach {tn2 oc res} {
    1 "ON CONFLICT DO NOTHING"                                 0
    2 "ON CONFLICT(y) WHERE x='xyz' COLLATE nocase DO NOTHING" 0
    3 "ON CONFLICT(y) WHERE x='xyz' COLLATE binary DO NOTHING" 2
    4 "ON CONFLICT(x) WHERE y>0 DO NOTHING"                    1
  } {
    do_catchsql_test 4.$tn.2.$tn2 "
      INSERT INTO abc VALUES(5, 'xYz', 3) $oc
    " $rtbl($res)
  }
}

do_catchsql_test 5.0 {
  CREATE TABLE w1(a INT PRIMARY KEY, x, y);
  CREATE UNIQUE INDEX w1expr ON w1(('x' || x));
  INSERT INTO w1 VALUES(2, 'one', NULL)
    ON CONFLICT (('x' || x) COLLATE nocase) DO NOTHING;
} {1 {ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint}}

#-------------------------------------------------------------------------
# Test that ON CONFLICT constraint processing occurs before any REPLACE
# constraint processing.
#
foreach {tn sql} {
  1 {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE, c);
  }
  2 {
    CREATE TABLE t1(a INT PRIMARY KEY, b UNIQUE, c);
  }
  3 {
    CREATE TABLE t1(a INT PRIMARY KEY, b UNIQUE, c) WITHOUT ROWID;
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 6.1.$tn {
    INSERT INTO t1 VALUES(1, 1, 'one');
    INSERT INTO t1 VALUES(2, 2, 'two');
    INSERT OR REPLACE INTO t1 VALUES(1, 2, 'two') ON CONFLICT(b) DO NOTHING;
    PRAGMA integrity_check;
  } {ok}
}

foreach {tn sql} {
  1 {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE, c UNIQUE);
  }
} {
  reset_db
  execsql $sql

  do_execsql_test 6.2.$tn.1 {
    INSERT INTO t1 VALUES(1, 1, 1);
    INSERT INTO t1 VALUES(2, 2, 2);
  }

  do_execsql_test 6.2.$tn.2 {
    INSERT OR REPLACE INTO t1 VALUES(3, 1, 1) ON CONFLICT(b) DO NOTHING;
    SELECT * FROM t1;
    PRAGMA integrity_check;
  } {1 1 1 2 2 2 ok}

  do_execsql_test 6.2.$tn.3 {
    INSERT OR REPLACE INTO t1 VALUES(3, 2, 2) ON CONFLICT(c) DO NOTHING;
    SELECT * FROM t1;
    PRAGMA integrity_check;
  } {1 1 1 2 2 2 ok}

  do_execsql_test 6.2.$tn.2 {
    INSERT OR REPLACE INTO t1 VALUES(3, 1, 1) ON CONFLICT(b) 
      DO UPDATE SET b=b||'x';
    SELECT * FROM t1;
    PRAGMA integrity_check;
  } {1 1x 1 2 2 2 ok}

  do_execsql_test 6.2.$tn.2 {
    INSERT OR REPLACE INTO t1 VALUES(3, 2, 2) ON CONFLICT(c) 
      DO UPDATE SET c=c||'x';
    SELECT * FROM t1;
    PRAGMA integrity_check;
  } {1 1x 1 2 2 2x ok}
}

#-------------------------------------------------------------------------
# Test references to "excluded". And using an alias in an INSERT 
# statement.
#
foreach {tn sql} {
  1 {
    CREATE TABLE t1(w, x, y, z, PRIMARY KEY(x, y));
    CREATE UNIQUE INDEX zz ON t1(z);
  }
  2 {
    CREATE TABLE t1(w, x, y, z, PRIMARY KEY(x, y)) WITHOUT ROWID;
    CREATE UNIQUE INDEX zz ON t1(z);
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 7.$tn.0 {
    INSERT INTO t1 VALUES('a', 1, 1, 1);
    INSERT INTO t1 VALUES('b', 2, 2, 2);
  }

  do_execsql_test 7.$tn.1 {
    INSERT INTO t1 VALUES('c', 3, 3, 1) ON CONFLICT(z) 
      DO UPDATE SET w = excluded.w;
    SELECT * FROM t1;
  } {c 1 1 1 b 2 2 2}

  do_execsql_test 7.$tn.2 {
    INSERT INTO t1 VALUES('c', 2, 2, 3) ON CONFLICT(y, x) 
      DO UPDATE SET w = w||w;
    SELECT * FROM t1;
  } {c 1 1 1 bb 2 2 2}

  do_execsql_test 7.$tn.3 {
    INSERT INTO t1 VALUES('c', 2, 2, 3) ON CONFLICT(y, x) 
      DO UPDATE SET w = w||t1.w;
    SELECT * FROM t1;
  } {c 1 1 1 bbbb 2 2 2}

  do_execsql_test 7.$tn.4 {
    INSERT INTO t1 AS tbl VALUES('c', 2, 2, 3) ON CONFLICT(y, x) 
      DO UPDATE SET w = w||tbl.w;
    SELECT * FROM t1;
  } {c 1 1 1 bbbbbbbb 2 2 2}
}

foreach {tn sql} {
  1 {
    CREATE TABLE excluded(w, x INTEGER, 'a b', z, PRIMARY KEY(x, 'a b'));
    CREATE UNIQUE INDEX zz ON excluded(z);
    CREATE INDEX zz2 ON excluded(z);
  }
  2 {
    CREATE TABLE excluded(w, x, 'a b', z, PRIMARY KEY(x, 'a b')) WITHOUT ROWID;
    CREATE UNIQUE INDEX zz ON excluded(z);
    CREATE INDEX zz2 ON excluded(z);
  }
} {
  reset_db
  execsql $sql
  do_execsql_test 8.$tn.0 {
    INSERT INTO excluded VALUES('a', 1, 1, 1);
    INSERT INTO excluded VALUES('b', 2, 2, 2);
  }

  # Note: An error in Postgres: "table reference "excluded" is ambiguous".
  #
  do_execsql_test 8.$tn.1 {
    INSERT INTO excluded VALUES('hello', 1, 1, NULL) ON CONFLICT(x, "a b")
      DO UPDATE SET w=excluded.w;
    SELECT * FROM excluded;
  } {a 1 1 1 b 2 2 2}

  do_execsql_test 8.$tn.2 {
    INSERT INTO excluded AS x1 VALUES('hello', 1, 1, NULL) ON CONFLICT(x, [a b])
      DO UPDATE SET w=excluded.w;
    SELECT * FROM excluded;
  } {hello 1 1 1 b 2 2 2}

  do_execsql_test 8.$tn.3 {
    INSERT INTO excluded AS x1 VALUES('hello', 1, 1, NULL) ON CONFLICT(x, [a b])
      DO UPDATE SET w=w||w WHERE excluded.w!='hello';
    SELECT * FROM excluded;
  } {hello 1 1 1 b 2 2 2}

  do_execsql_test 8.$tn.4 {
    INSERT INTO excluded AS x1 VALUES('hello', 1, 1, NULL) ON CONFLICT(x, [a b])
      DO UPDATE SET w=w||w WHERE excluded.x=1;
    SELECT * FROM excluded;
  } {hellohello 1 1 1 b 2 2 2}

  do_catchsql_test 8.$tn.5 {
    INSERT INTO excluded AS x1 VALUES('hello', 1, 1, NULL) 
      ON CONFLICT(x, [a b]) WHERE y=1
      DO UPDATE SET w=w||w WHERE excluded.x=1;
  } {1 {no such column: y}}
}

#--------------------------------------------------------------------------
#
do_execsql_test 9.0 {
  CREATE TABLE v(x INTEGER);
  CREATE TABLE hist(x INTEGER PRIMARY KEY, cnt INTEGER);
  CREATE TRIGGER vt AFTER INSERT ON v BEGIN
    INSERT INTO hist VALUES(new.x, 1) ON CONFLICT(x) DO
      UPDATE SET cnt=cnt+1;
  END;
}

do_execsql_test 9.1 {
  INSERT INTO v VALUES(1), (4), (1), (5), (5), (8), (9), (1);
  SELECT * FROM hist;
} {
  1 3
  4 1
  5 2
  8 1
  9 1
}


finish_test
