# 2005 September 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify that ticket #1473 has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return 
}

do_test tkt1473-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(3,4);
    SELECT * FROM t1
  }
} {1 2 3 4}

do_test tkt1473-1.2 {
  execsql {
    SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=0
  }
} {1}
do_test tkt1473-1.3 {
  execsql {
    SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=0
  }
} {1}
do_test tkt1473-1.4 {
  execsql {
    SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=4
  }
} {1 2}
do_test tkt1473-1.5 {
  execsql {
    SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=4
  }
} {1 2}
do_test tkt1473-1.6 {
  execsql {
    SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=4
  }
} {2}
do_test tkt1473-1.7 {
  execsql {
    SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=4
  }
} {2}
do_test tkt1473-1.8 {
  execsql {
    SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=0
  }
} {}
do_test tkt1473-1.9 {
  execsql {
    SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=0
  }
} {}

# Everything from this point on depends on sub-queries. So skip it
# if sub-queries are not available.
ifcapable !subquery {
  finish_test
  return
}

do_test tkt1473-2.2 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=0)
  }
} {1}
do_test tkt1473-2.3 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=0)
  }
} {1}
do_test tkt1473-2.4 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-2.5 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-2.6 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=4)
  }
} {2}
do_test tkt1473-2.7 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=4)
  }
} {2}
do_test tkt1473-2.8 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=0)
  }
} {{}}
do_test tkt1473-2.9 {
  execsql {
    SELECT (SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=0)
  }
} {{}}

do_test tkt1473-3.2 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=0)
  }
} {1}
do_test tkt1473-3.3 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=0)
  }
} {1}
do_test tkt1473-3.4 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=1 UNION ALL SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-3.5 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=1 UNION SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-3.6 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-3.7 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=4)
  }
} {1}
do_test tkt1473-3.8 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=0 UNION ALL SELECT 2 FROM t1 WHERE b=0)
  }
} {0}
do_test tkt1473-3.9 {
  execsql {
    SELECT EXISTS
      (SELECT 1 FROM t1 WHERE a=0 UNION SELECT 2 FROM t1 WHERE b=0)
  }
} {0}

do_test tkt1473-4.1 {
  execsql {
    CREATE TABLE t2(x,y);
    INSERT INTO t2 VALUES(1,2);
    INSERT INTO t2 SELECT x+2, y+2 FROM t2;
    INSERT INTO t2 SELECT x+4, y+4 FROM t2;
    INSERT INTO t2 SELECT x+8, y+8 FROM t2;
    INSERT INTO t2 SELECT x+16, y+16 FROM t2;
    INSERT INTO t2 SELECT x+32, y+32 FROM t2;
    INSERT INTO t2 SELECT x+64, y+64 FROM t2;
    SELECT count(*), sum(x), sum(y) FROM t2;
  }
} {64 4096 4160}
do_test tkt1473-4.2 {
  execsql {
    SELECT 1 FROM t2 WHERE x=0
    UNION ALL
    SELECT 2 FROM t2 WHERE x=1
    UNION ALL
    SELECT 3 FROM t2 WHERE x=2
    UNION ALL
    SELECT 4 FROM t2 WHERE x=3
    UNION ALL
    SELECT 5 FROM t2 WHERE x=4
    UNION ALL
    SELECT 6 FROM t2 WHERE y=0
    UNION ALL
    SELECT 7 FROM t2 WHERE y=1
    UNION ALL
    SELECT 8 FROM t2 WHERE y=2
    UNION ALL
    SELECT 9 FROM t2 WHERE y=3
    UNION ALL
    SELECT 10 FROM t2 WHERE y=4
  }
} {2 4 8 10}
do_test tkt1473-4.3 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=3
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {2}
do_test tkt1473-4.4 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=3
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {4}
do_test tkt1473-4.5 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {8}
do_test tkt1473-4.6 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-2
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=-3
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {10}
do_test tkt1473-4.7 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-2
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=-3
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {{}}

do_test tkt1473-5.3 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=3
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}
do_test tkt1473-5.4 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=3
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}

do_test tkt1473-5.5 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=2
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {1}
do_test tkt1473-5.6 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-2
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=-3
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}
do_test tkt1473-5.7 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION ALL
      SELECT 2 FROM t2 WHERE x=-1
      UNION ALL
      SELECT 3 FROM t2 WHERE x=2
      UNION ALL
      SELECT 4 FROM t2 WHERE x=-2
      UNION ALL
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION ALL
      SELECT 7 FROM t2 WHERE y=1
      UNION ALL
      SELECT 8 FROM t2 WHERE y=-3
      UNION ALL
      SELECT 9 FROM t2 WHERE y=3
      UNION ALL
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {0}

do_test tkt1473-6.3 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=3
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=2
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}
do_test tkt1473-6.4 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=3
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=2
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}

do_test tkt1473-6.5 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=-1
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=2
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {1}
do_test tkt1473-6.6 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=-2
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=-3
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}
do_test tkt1473-6.7 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=-2
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=-3
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {0}
do_test tkt1473-6.8 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=-2
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=-3
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=4
    )
  }
} {1}
do_test tkt1473-6.9 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0
      UNION
      SELECT 2 FROM t2 WHERE x=-1
      UNION
      SELECT 3 FROM t2 WHERE x=2
      UNION
      SELECT 4 FROM t2 WHERE x=-2
      UNION
      SELECT 5 FROM t2 WHERE x=4
      UNION ALL
      SELECT 6 FROM t2 WHERE y=0
      UNION
      SELECT 7 FROM t2 WHERE y=1
      UNION
      SELECT 8 FROM t2 WHERE y=-3
      UNION
      SELECT 9 FROM t2 WHERE y=3
      UNION
      SELECT 10 FROM t2 WHERE y=-4
    )
  }
} {0}

do_test tkt1473-7.1 {
  execsql {
    SELECT 1 FROM t2 WHERE x=1 EXCEPT SELECT 2 FROM t2 WHERE y=2
  }
} {1}
do_test tkt1473-7.2 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=1 EXCEPT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {1}
do_test tkt1473-7.3 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=1 EXCEPT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {1}
do_test tkt1473-7.4 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0 EXCEPT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {{}}
do_test tkt1473-7.5 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=0 EXCEPT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {0}

do_test tkt1473-8.1 {
  execsql {
    SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 2 FROM t2 WHERE y=2
  }
} {}
do_test tkt1473-8.1 {
  execsql {
    SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 1 FROM t2 WHERE y=2
  }
} {1}
do_test tkt1473-8.3 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {{}}
do_test tkt1473-8.4 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 1 FROM t2 WHERE y=2
    )
  }
} {1}
do_test tkt1473-8.5 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 2 FROM t2 WHERE y=2
    )
  }
} {0}
do_test tkt1473-8.6 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 1 FROM t2 WHERE y=2
    )
  }
} {1}
do_test tkt1473-8.7 {
  execsql {
    SELECT (
      SELECT 1 FROM t2 WHERE x=0 INTERSECT SELECT 1 FROM t2 WHERE y=2
    )
  }
} {{}}
do_test tkt1473-8.8 {
  execsql {
    SELECT EXISTS (
      SELECT 1 FROM t2 WHERE x=1 INTERSECT SELECT 1 FROM t2 WHERE y=0
    )
  }
} {0}




finish_test
