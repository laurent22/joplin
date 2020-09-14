# 2008 February 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests issues relating to firing an INSTEAD OF trigger on a VIEW
# when one tries to UPDATE or DELETE from the view.  Does the WHERE
# clause of the UPDATE or DELETE statement get passed down correctly 
# into the query that manifests the view?
#
# Ticket #2938
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !trigger||!compound {
  finish_test
  return
}

# Create two table containing some sample data
#
do_test triggerA-1.1 {
  db eval {
    CREATE TABLE t1(x INTEGER PRIMARY KEY, y TEXT UNIQUE);
    CREATE TABLE t2(a INTEGER PRIMARY KEY, b INTEGER UNIQUE, c TEXT);
  }
  set i 1
  foreach word {one two three four five six seven eight nine ten} {
    set j [expr {$i*100 + [string length $word]}]
    db eval {
       INSERT INTO t1 VALUES($i,$word);
       INSERT INTO t2 VALUES(20-$i,$j,$word);
    }
    incr i
  }
  db eval {
    SELECT count(*) FROM t1 UNION ALL SELECT count(*) FROM t2;
  }
} {10 10}

# Create views of various forms against one or both of the two tables.
#
do_test triggerA-1.2 {
  db eval {
     CREATE VIEW v1 AS SELECT y, x FROM t1;
     SELECT * FROM v1 ORDER BY 1;
  }
} {eight 8 five 5 four 4 nine 9 one 1 seven 7 six 6 ten 10 three 3 two 2}
do_test triggerA-1.3 {
  db eval {
     CREATE VIEW v2 AS SELECT x, y FROM t1 WHERE y GLOB '*e*';
     SELECT * FROM v2 ORDER BY 1;
  }
} {1 one 3 three 5 five 7 seven 8 eight 9 nine 10 ten}
do_test triggerA-1.4 {
  db eval {
     CREATE VIEW v3 AS
       SELECT CAST(x AS TEXT) AS c1 FROM t1 UNION SELECT y FROM t1;
     SELECT * FROM v3 ORDER BY c1;
  }
} {1 10 2 3 4 5 6 7 8 9 eight five four nine one seven six ten three two}
do_test triggerA-1.5 {
  db eval {
     CREATE VIEW v4 AS
        SELECT CAST(x AS TEXT) AS c1 FROM t1
        UNION SELECT y FROM t1 WHERE x BETWEEN 3 and 5;
     SELECT * FROM v4 ORDER BY 1;
  }
} {1 10 2 3 4 5 6 7 8 9 five four three}
do_test triggerA-1.6 {
  db eval {
     CREATE VIEW v5 AS SELECT x, b FROM t1, t2 WHERE y=c;
     SELECT * FROM v5 ORDER BY x DESC;
  }
} {10 1003 9 904 8 805 7 705 6 603 5 504 4 404 3 305 2 203 1 103}

# Create INSTEAD OF triggers on the views.  Run UPDATE and DELETE statements
# using those triggers.  Verify correct operation.
#
do_test triggerA-2.1 {
  db eval {
     CREATE TABLE result2(a,b);
     CREATE TRIGGER r1d INSTEAD OF DELETE ON v1 BEGIN
       INSERT INTO result2(a,b) VALUES(old.y, old.x);
     END;
     DELETE FROM v1 WHERE x=5;
     SELECT * FROM result2;
  }
} {five 5}
do_test triggerA-2.2 {
  db eval {
     CREATE TABLE result4(a,b,c,d);
     CREATE TRIGGER r1u INSTEAD OF UPDATE ON v1 BEGIN
       INSERT INTO result4(a,b,c,d) VALUES(old.y, old.x, new.y, new.x);
     END;
     UPDATE v1 SET y=y||'-extra' WHERE x BETWEEN 3 AND 5;
     SELECT * FROM result4 ORDER BY a;
  }
} {five 5 five-extra 5 four 4 four-extra 4 three 3 three-extra 3}


do_test triggerA-2.3 {
  db eval {
     DELETE FROM result2;
     CREATE TRIGGER r2d INSTEAD OF DELETE ON v2 BEGIN
       INSERT INTO result2(a,b) VALUES(old.y, old.x);
     END;
     DELETE FROM v2 WHERE x=5;
     SELECT * FROM result2;
  }
} {five 5}
do_test triggerA-2.4 {
  db eval {
     DELETE FROM result4;
     CREATE TRIGGER r2u INSTEAD OF UPDATE ON v2 BEGIN
       INSERT INTO result4(a,b,c,d) VALUES(old.y, old.x, new.y, new.x);
     END;
     UPDATE v2 SET y=y||'-extra' WHERE x BETWEEN 3 AND 5;
     SELECT * FROM result4 ORDER BY a;
  }
} {five 5 five-extra 5 three 3 three-extra 3}


do_test triggerA-2.5 {
  db eval {
     CREATE TABLE result1(a);
     CREATE TRIGGER r3d INSTEAD OF DELETE ON v3 BEGIN
       INSERT INTO result1(a) VALUES(old.c1);
     END;
     DELETE FROM v3 WHERE c1 BETWEEN '8' AND 'eight';
     SELECT * FROM result1 ORDER BY a;
  }
} {8 9 eight}
do_test triggerA-2.6 {
  db eval {
     DELETE FROM result2;
     CREATE TRIGGER r3u INSTEAD OF UPDATE ON v3 BEGIN
       INSERT INTO result2(a,b) VALUES(old.c1, new.c1);
     END;
     UPDATE v3 SET c1 = c1 || '-extra' WHERE c1 BETWEEN '8' and 'eight';
     SELECT * FROM result2 ORDER BY a;
  }
} {8 8-extra 9 9-extra eight eight-extra}


do_test triggerA-2.7 {
  db eval {
     DELETE FROM result1;
     CREATE TRIGGER r4d INSTEAD OF DELETE ON v4 BEGIN
       INSERT INTO result1(a) VALUES(old.c1);
     END;
     DELETE FROM v4 WHERE c1 BETWEEN '8' AND 'eight';
     SELECT * FROM result1 ORDER BY a;
  }
} {8 9}
do_test triggerA-2.8 {
  db eval {
     DELETE FROM result2;
     CREATE TRIGGER r4u INSTEAD OF UPDATE ON v4 BEGIN
       INSERT INTO result2(a,b) VALUES(old.c1, new.c1);
     END;
     UPDATE v4 SET c1 = c1 || '-extra' WHERE c1 BETWEEN '8' and 'eight';
     SELECT * FROM result2 ORDER BY a;
  }
} {8 8-extra 9 9-extra}


do_test triggerA-2.9 {
  db eval {
     DELETE FROM result2;
     CREATE TRIGGER r5d INSTEAD OF DELETE ON v5 BEGIN
       INSERT INTO result2(a,b) VALUES(old.x, old.b);
     END;
     DELETE FROM v5 WHERE x=5;
     SELECT * FROM result2;
  }
} {5 504}
do_test triggerA-2.10 {
  db eval {
     DELETE FROM result4;
     CREATE TRIGGER r5u INSTEAD OF UPDATE ON v5 BEGIN
       INSERT INTO result4(a,b,c,d) VALUES(old.x, old.b, new.x, new.b);
     END;
     UPDATE v5 SET b = b+9900000 WHERE x BETWEEN 3 AND 5;
     SELECT * FROM result4 ORDER BY a;
  }
} {3 305 3 9900305 4 404 4 9900404 5 504 5 9900504}
do_test triggerA-2.11 {
  db eval {
     DELETE FROM result4;
     UPDATE v5 SET b = main.v5.b+9900000 WHERE main.v5.x BETWEEN 3 AND 5;
     SELECT * FROM result4 ORDER BY a;
  }
} {3 305 3 9900305 4 404 4 9900404 5 504 5 9900504}

source $testdir/malloc_common.tcl

# Save a copy of the current database configuration.
#
db close
forcedelete test.db-triggerA
copy_file test.db test.db-triggerA
sqlite3 db test.db

# Run malloc tests on the INSTEAD OF trigger firing.
#
do_malloc_test triggerA-3 -tclprep {
  db close
  forcedelete test.db test.db-journal
  forcecopy test.db-triggerA test.db
  sqlite3 db test.db
  sqlite3_extended_result_codes db 1  
  db eval {SELECT * FROM v5; -- warm up the cache}
} -sqlbody {
   DELETE FROM v5 WHERE x=5;
   UPDATE v5 SET b=b+9900000 WHERE x BETWEEN 3 AND 5;
}

# Clean up the saved database copy.
#
forcedelete test.db-triggerA

finish_test
