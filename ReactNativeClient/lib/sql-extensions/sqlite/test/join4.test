# 2002 May 24
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
# This file implements tests for left outer joins containing WHERE
# clauses that restrict the scope of the left term of the join.
#
# $Id: join4.test,v 1.4 2005/03/29 03:11:00 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable tempdb {
  do_test join4-1.1 {
    execsql {
      create temp table t1(a integer, b varchar(10));
      insert into t1 values(1,'one');
      insert into t1 values(2,'two');
      insert into t1 values(3,'three');
      insert into t1 values(4,'four');
  
      create temp table t2(x integer, y varchar(10), z varchar(10));
      insert into t2 values(2,'niban','ok');
      insert into t2 values(4,'yonban','err');
    }
    execsql {
      select * from t1 left outer join t2 on t1.a=t2.x where t2.z='ok'
    }
  } {2 two 2 niban ok}
} else {
  do_test join4-1.1 {
    execsql {
      create table t1(a integer, b varchar(10));
      insert into t1 values(1,'one');
      insert into t1 values(2,'two');
      insert into t1 values(3,'three');
      insert into t1 values(4,'four');
  
      create table t2(x integer, y varchar(10), z varchar(10));
      insert into t2 values(2,'niban','ok');
      insert into t2 values(4,'yonban','err');
    }
    execsql {
      select * from t1 left outer join t2 on t1.a=t2.x where t2.z='ok'
    }
  } {2 two 2 niban ok}
}
do_test join4-1.2 {
  execsql {
    select * from t1 left outer join t2 on t1.a=t2.x and t2.z='ok'
  }
} {1 one {} {} {} 2 two 2 niban ok 3 three {} {} {} 4 four {} {} {}}
do_test join4-1.3 {
  execsql {
    create index i2 on t2(z);
  }
  execsql {
    select * from t1 left outer join t2 on t1.a=t2.x where t2.z='ok'
  }
} {2 two 2 niban ok}
do_test join4-1.4 {
  execsql {
    select * from t1 left outer join t2 on t1.a=t2.x and t2.z='ok'
  }
} {1 one {} {} {} 2 two 2 niban ok 3 three {} {} {} 4 four {} {} {}}
do_test join4-1.5 {
  execsql {
    select * from t1 left outer join t2 on t1.a=t2.x where t2.z>='ok'
  }
} {2 two 2 niban ok}
do_test join4-1.4 {
  execsql {
    select * from t1 left outer join t2 on t1.a=t2.x and t2.z>='ok'
  }
} {1 one {} {} {} 2 two 2 niban ok 3 three {} {} {} 4 four {} {} {}}
ifcapable subquery {
  do_test join4-1.6 {
    execsql {
      select * from t1 left outer join t2 on t1.a=t2.x where t2.z IN ('ok')
    }
  } {2 two 2 niban ok}
  do_test join4-1.7 {
    execsql {
      select * from t1 left outer join t2 on t1.a=t2.x and t2.z IN ('ok')
    }
  } {1 one {} {} {} 2 two 2 niban ok 3 three {} {} {} 4 four {} {} {}}
}


finish_test
