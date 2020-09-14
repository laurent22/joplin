# 2008 July 14
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
# Test the btree mutex protocol for shared cache mode.
#
# $Id: shared4.test,v 1.2 2008/08/04 03:51:24 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
db close

# This script is only valid if we are running shared-cache mode in a
# threadsafe-capable database engine.
#
ifcapable !shared_cache||!compound {
  finish_test
  return
}
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

# Prepare multiple databases in shared cache mode.
#
do_test shared4-1.1 {
  forcedelete test1.db test1.db-journal
  forcedelete test2.db test2.db-journal
  forcedelete test3.db test3.db-journal
  forcedelete test4.db test4.db-journal
  sqlite3 db1 test1.db
  sqlite3 db2 test2.db
  sqlite3 db3 test3.db
  sqlite3 db4 test4.db
  db1 eval {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(111);
  }
  db2 eval {
    CREATE TABLE t2(b);
    INSERT INTO t2 VALUES(222);
  }
  db3 eval {
    CREATE TABLE t3(c);
    INSERT INTO t3 VALUES(333);
  }
  db4 eval {
    CREATE TABLE t4(d);
    INSERT INTO t4 VALUES(444);
  }
  db1 eval {
    ATTACH DATABASE 'test2.db' AS two;
    ATTACH DATABASE 'test3.db' AS three;
    ATTACH DATABASE 'test4.db' AS four;
  }
  db2 eval {
    ATTACH DATABASE 'test4.db' AS four;
    ATTACH DATABASE 'test3.db' AS three;
    ATTACH DATABASE 'test1.db' AS one;
  }
  db3 eval {
    ATTACH DATABASE 'test1.db' AS one;
    ATTACH DATABASE 'test2.db' AS two;
    ATTACH DATABASE 'test4.db' AS four;
  }
  db4 eval {
    ATTACH DATABASE 'test3.db' AS three;
    ATTACH DATABASE 'test2.db' AS two;
    ATTACH DATABASE 'test1.db' AS one;
  }
  db1 eval {
     SELECT a FROM t1 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4;
  }
} {111 222 333 444}
do_test shared4-1.2 {
  db2 eval {
     SELECT a FROM t1 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT c FROM t3;
  }
} {111 222 444 333}
do_test shared4-1.3 {
  db3 eval {
     SELECT a FROM t1 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT d FROM t4;
  }
} {111 333 222 444}
do_test shared4-1.4 {
  db4 eval {
     SELECT a FROM t1 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT b FROM t2;
  }
} {111 333 444 222}
do_test shared4-1.5 {
  db3 eval {
     SELECT a FROM t1 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT c FROM t3;
  }
} {111 444 222 333}
do_test shared4-1.6 {
  db4 eval {
     SELECT a FROM t1 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT b FROM t2;
  }
} {111 444 333 222}
do_test shared4-1.7 {
  db1 eval {
     SELECT b FROM t2 UNION ALL
     SELECT a FROM t1 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4;
  }
} {222 111 333 444}
do_test shared4-1.8 {
  db2 eval {
     SELECT b FROM t2 UNION ALL
     SELECT a FROM t1 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT c FROM t3;
  }
} {222 111 444 333}
do_test shared4-1.9 {
  db3 eval {
     SELECT b FROM t2 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT a FROM t1 UNION ALL
     SELECT d FROM t4;
  }
} {222 333 111 444}
do_test shared4-1.10 {
  db4 eval {
     SELECT b FROM t2 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT a FROM t1;
  }
} {222 333 444 111}
do_test shared4-1.11 {
  db1 eval {
     SELECT c FROM t3 UNION ALL
     SELECT a FROM t1 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT d FROM t4;
  }
} {333 111 222 444}
do_test shared4-1.12 {
  db2 eval {
     SELECT c FROM t3 UNION ALL
     SELECT a FROM t1 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT b FROM t2;
  }
} {333 111 444 222}

do_test shared4-2.1 {
  db1 eval {
    UPDATE t1 SET a=a+1000;
    UPDATE t2 SET b=b+2000;
    UPDATE t3 SET c=c+3000;
    UPDATE t4 SET d=d+4000;
  }
  db2 eval {
    UPDATE t1 SET a=a+10000;
    UPDATE t2 SET b=b+20000;
    UPDATE t3 SET c=c+30000;
    UPDATE t4 SET d=d+40000;
  }
  db3 eval {
    UPDATE t1 SET a=a+100000;
    UPDATE t2 SET b=b+200000;
    UPDATE t3 SET c=c+300000;
    UPDATE t4 SET d=d+400000;
  }
  db4 eval {
    UPDATE t1 SET a=a+1000000;
    UPDATE t2 SET b=b+2000000;
    UPDATE t3 SET c=c+3000000;
    UPDATE t4 SET d=d+4000000;
  }
  db1 eval {
     SELECT a FROM t1 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4;
  }
} {1111111 2222222 3333333 4444444}
do_test shared4-2.2 {
  db2 eval {
     SELECT a FROM t1 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT c FROM t3;
  }
} {1111111 2222222 4444444 3333333}
do_test shared4-2.3 {
  db3 eval {
     SELECT a FROM t1 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT b FROM t2 UNION ALL
     SELECT d FROM t4;
  }
} {1111111 3333333 2222222 4444444}
do_test shared4-2.4 {
  db4 eval {
     SELECT a FROM t1 UNION ALL
     SELECT c FROM t3 UNION ALL
     SELECT d FROM t4 UNION ALL
     SELECT b FROM t2;
  }
} {1111111 3333333 4444444 2222222}


db1 close
db2 close
db3 close
db4 close

sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
