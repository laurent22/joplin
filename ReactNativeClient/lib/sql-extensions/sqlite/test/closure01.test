# 2013-04-25
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
# Test cases for transitive_closure virtual table.

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix closure01

ifcapable !vtab||!cte { finish_test ; return }

load_static_extension db closure

do_execsql_test 1.0 {
  BEGIN;
  CREATE TABLE t1(x INTEGER PRIMARY KEY, y INTEGER);
  WITH RECURSIVE
    cnt(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM cnt LIMIT 131072)
  INSERT INTO t1(x, y) SELECT i, nullif(i,1)/2 FROM cnt;
  CREATE INDEX t1y ON t1(y);
  COMMIT;
  CREATE VIRTUAL TABLE cx 
   USING transitive_closure(tablename=t1, idcolumn=x, parentcolumn=y);
} {}

# The entire table
do_timed_execsql_test 1.1 {
  SELECT count(*), depth FROM cx WHERE root=1 GROUP BY depth ORDER BY 1;
} {/1 0 1 17 2 1 4 2 8 3 16 4 .* 65536 16/}
do_timed_execsql_test 1.1-cte {
  WITH RECURSIVE
    below(id,depth) AS (
      VALUES(1,0)
       UNION ALL
      SELECT t1.x, below.depth+1
        FROM t1 JOIN below on t1.y=below.id
    )
  SELECT count(*), depth FROM below GROUP BY depth ORDER BY 1;
} {/1 0 1 17 2 1 4 2 8 3 16 4 .* 65536 16/}

# descendents of 32768
do_timed_execsql_test 1.2 {
  SELECT * FROM cx WHERE root=32768 ORDER BY id;
} {32768 0 65536 1 65537 1 131072 2}
do_timed_execsql_test 1.2-cte {
  WITH RECURSIVE
    below(id,depth) AS (
      VALUES(32768,0)
       UNION ALL
      SELECT t1.x, below.depth+1
        FROM t1 JOIN below on t1.y=below.id
       WHERE below.depth<2
    )
  SELECT id, depth FROM below ORDER BY id;
} {32768 0 65536 1 65537 1 131072 2}

# descendents of 16384
do_timed_execsql_test 1.3 {
  SELECT * FROM cx WHERE root=16384 AND depth<=2 ORDER BY id;
} {16384 0 32768 1 32769 1 65536 2 65537 2 65538 2 65539 2}
do_timed_execsql_test 1.3-cte {
  WITH RECURSIVE
    below(id,depth) AS (
      VALUES(16384,0)
       UNION ALL
      SELECT t1.x, below.depth+1
        FROM t1 JOIN below on t1.y=below.id
       WHERE below.depth<2
    )
  SELECT id, depth FROM below ORDER BY id;
} {16384 0 32768 1 32769 1 65536 2 65537 2 65538 2 65539 2}

# children of 16384
do_execsql_test 1.4 {
  SELECT id, depth, root, tablename, idcolumn, parentcolumn FROM cx
   WHERE root=16384
     AND depth=1
   ORDER BY id;
} {32768 1 {} t1 x y 32769 1 {} t1 x y}

# great-grandparent of 16384
do_timed_execsql_test 1.5 {
  SELECT id, depth, root, tablename, idcolumn, parentcolumn FROM cx
   WHERE root=16384
     AND depth=3
     AND idcolumn='Y'
     AND parentcolumn='X';
} {2048 3 {} t1 Y X}
do_timed_execsql_test 1.5-cte {
  WITH RECURSIVE
    above(id,depth) AS (
      VALUES(16384,0)
      UNION ALL
      SELECT t1.y, above.depth+1
        FROM t1 JOIN above ON t1.x=above.id
       WHERE above.depth<3
    )
  SELECT id FROM above WHERE depth=3;
} {2048}

# depth<5
do_timed_execsql_test 1.6 {
  SELECT count(*), depth FROM cx WHERE root=1 AND depth<5
   GROUP BY depth ORDER BY 1;
} {1 0 2 1 4 2 8 3 16 4}
do_timed_execsql_test 1.6-cte {
  WITH RECURSIVE
    below(id,depth) AS (
      VALUES(1,0)
      UNION ALL
      SELECT t1.x, below.depth+1
        FROM t1 JOIN below ON t1.y=below.id
       WHERE below.depth<4
    )
  SELECT count(*), depth FROM below GROUP BY depth ORDER BY 1;
} {1 0 2 1 4 2 8 3 16 4}

# depth<=5
do_execsql_test 1.7 {
  SELECT count(*), depth FROM cx WHERE root=1 AND depth<=5
   GROUP BY depth ORDER BY 1;
} {1 0 2 1 4 2 8 3 16 4 32 5}

# depth==5
do_execsql_test 1.8 {
  SELECT count(*), depth FROM cx WHERE root=1 AND depth=5
   GROUP BY depth ORDER BY 1;
} {32 5}

# depth BETWEEN 3 AND 5
do_execsql_test 1.9 {
  SELECT count(*), depth FROM cx WHERE root=1 AND depth BETWEEN 3 AND 5
   GROUP BY depth ORDER BY 1;
} {8 3 16 4 32 5}

# depth==5 with min() and max()
do_timed_execsql_test 1.10 {
  SELECT count(*), min(id), max(id) FROM cx WHERE root=1 AND depth=5;
} {32 32 63}
do_timed_execsql_test 1.10-cte {
  WITH RECURSIVE
    below(id,depth) AS (
      VALUES(1,0)
      UNION ALL
      SELECT t1.x, below.depth+1
        FROM t1 JOIN below ON t1.y=below.id
       WHERE below.depth<5
    )
  SELECT count(*), min(id), max(id) FROM below WHERE depth=5;
} {32 32 63}

# Create a much smaller table t2 with only 32 elements 
db eval {
  CREATE TABLE t2(x INTEGER PRIMARY KEY, y INTEGER);
  INSERT INTO t2 SELECT x, y FROM t1 WHERE x<32;
  CREATE INDEX t2y ON t2(y);
  CREATE VIRTUAL TABLE c2 
   USING transitive_closure(tablename=t2, idcolumn=x, parentcolumn=y);
}

# t2 full-table
do_execsql_test 2.1 {
  SELECT count(*), min(id), max(id) FROM c2 WHERE root=1;
} {31 1 31}
# t2 root=10
do_execsql_test 2.2 {
  SELECT id FROM c2 WHERE root=10;
} {10 20 21}
# t2 root=11
do_execsql_test 2.3 {
  SELECT id FROM c2 WHERE root=12;
} {12 24 25}
# t2 root IN [10,12]
do_execsql_test 2.4 {
  SELECT id FROM c2 WHERE root IN (10,12) ORDER BY id;
} {10 12 20 21 24 25}
# t2 root IN [10,12] (sorted)
do_execsql_test 2.5 {
  SELECT id FROM c2 WHERE root IN (10,12) ORDER BY +id;
} {10 12 20 21 24 25}

# t2 c2up from 20
do_execsql_test 3.0 {
  CREATE VIRTUAL TABLE c2up USING transitive_closure(
    tablename = t2,
    idcolumn = y,
    parentcolumn = x
  );
  SELECT id FROM c2up WHERE root=20;
} {1 2 5 10 20}

# cx as c2up
do_execsql_test 3.1 {
  SELECT id FROM cx
   WHERE root=20
     AND tablename='t2'
     AND idcolumn='y'
     AND parentcolumn='x';
} {1 2 5 10 20}

# t2 first cousins of 20
do_execsql_test 3.2 {
  SELECT DISTINCT id FROM c2
   WHERE root IN (SELECT id FROM c2up
                   WHERE root=20 AND depth<=2)
   ORDER BY id;
} {5 10 11 20 21 22 23}

# t2 first cousins of 20
do_execsql_test 3.3 {
  SELECT id FROM c2
   WHERE root=(SELECT id FROM c2up
               WHERE root=20 AND depth=2)
     AND depth=2
  EXCEPT
  SELECT id FROM c2
   WHERE root=(SELECT id FROM c2up
               WHERE root=20 AND depth=1)
     AND depth<=1
   ORDER BY id;
} {22 23}

# missing tablename.
do_test 4.1 {
  catchsql {
    SELECT id FROM cx
     WHERE root=20
       AND tablename='t3'
       AND idcolumn='y'
       AND parentcolumn='x';
  }
} {1 {no such table: t3}}

# missing idcolumn
do_test 4.2 {
  catchsql {
    SELECT id FROM cx
     WHERE root=20
       AND tablename='t2'
       AND idcolumn='xyz'
       AND parentcolumn='x';
  }
} {1 {no such column: t2.xyz}}

# missing parentcolumn
do_test 4.3 {
  catchsql {
    SELECT id FROM cx
     WHERE root=20
       AND tablename='t2'
       AND idcolumn='x'
       AND parentcolumn='pqr';
  }
} {1 {no such column: t2.pqr}}

# generic closure
do_execsql_test 5.1 {
  CREATE VIRTUAL TABLE temp.closure USING transitive_closure;
  SELECT id FROM closure
   WHERE root=1
     AND depth=3
     AND tablename='t1'
     AND idcolumn='x'
     AND parentcolumn='y'
  ORDER BY id;
} {8 9 10 11 12 13 14 15}

#-------------------------------------------------------------------------
# At one point the following join query was causing a malfunction in
# xBestIndex.
#
do_execsql_test 6.0 {
  CREATE TABLE t4 (
    id INTEGER PRIMARY KEY, 
    name TEXT NOT NULL,
    parent_id INTEGER
  );
  CREATE VIRTUAL TABLE vt4 USING transitive_closure (
    idcolumn=id, parentcolumn=parent_id, tablename=t4
  );
}

do_execsql_test 6.1 {
  SELECT * FROM t4, vt4 WHERE t4.id = vt4.root AND vt4.id=4 AND vt4.depth=2;
}

finish_test
