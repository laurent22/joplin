# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file tests the triggers of views.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If either views or triggers are disabled in this build, omit this file.
ifcapable {!trigger || !view} {
  finish_test
  return
}

do_test trigger4-1.1 {
  execsql {
    create table test1(id integer primary key,a);
    create table test2(id integer,b);
    create view test as
      select test1.id as id,a as a,b as b
      from test1 join test2 on test2.id =  test1.id;
    create trigger I_test instead of insert on test
      begin
        insert into test1 (id,a) values (NEW.id,NEW.a);
        insert into test2 (id,b) values (NEW.id,NEW.b);
      end;
    insert into test values(1,2,3);
    select * from test1;
  }
} {1 2}
do_test trigger4-1.2 {
  execsql {
    select * from test2;
  }
} {1 3}
do_test trigger4-1.3 {
  db close
  sqlite3 db test.db
  execsql {
    insert into test values(4,5,6);
    select * from test1;
  }
} {1 2 4 5}
do_test trigger4-1.4 {
  execsql {
    select * from test2;
  }
} {1 3 4 6}

do_test trigger4-2.1 {
  execsql {
    create trigger U_test instead of update on test
      begin
        update test1 set a=NEW.a where id=NEW.id;
        update test2 set b=NEW.b where id=NEW.id;
      end;
    update test set a=22 where id=1;
    select * from test1;
  }
} {1 22 4 5}
do_test trigger4-2.2 {
  execsql {
    select * from test2;
  }
} {1 3 4 6}
do_test trigger4-2.3 {
  db close
  sqlite3 db test.db
  execsql {
    update test set b=66 where id=4;
    select * from test1;
  }
} {1 22 4 5}
do_test trigger4-2.4 {
  execsql {
    select * from test2;
  }
} {1 3 4 66}

do_test trigger4-3.1 {
  catchsql {
    drop table test2;
    insert into test values(7,8,9);
  }
} {1 {no such table: main.test2}}
do_test trigger4-3.2 {
  db close
  sqlite3 db test.db
  catchsql {
    insert into test values(7,8,9);
  }
} {1 {no such table: main.test2}}
do_test trigger4-3.3 {
  catchsql {
    update test set a=222 where id=1;
  }
} {1 {no such table: main.test2}}
do_test trigger4-3.4 {
  execsql {
    select * from test1;
  }
} {1 22 4 5}
do_test trigger4-3.5 {
  execsql {
    create table test2(id,b);
    insert into test values(7,8,9);
    select * from test1;
  }
} {1 22 4 5 7 8}
do_test trigger4-3.6 {
  execsql {
    select * from test2;
  }
} {7 9}
do_test trigger4-3.7 {
  db close
  sqlite3 db test.db
  execsql {
    update test set b=99 where id=7;
    select * from test2;
  }
} {7 99}

do_test trigger4-4.1 {
    db close
    forcedelete trigtest.db
    forcedelete trigtest.db-journal
    sqlite3 db trigtest.db
    catchsql {drop table tbl; drop view vw}
    execsql {
	create table tbl(a integer primary key, b integer);
	create view vw as select * from tbl;
	create trigger t_del_tbl instead of delete on vw for each row begin
	  delete from tbl where a = old.a;
	end;
	create trigger t_upd_tbl instead of update on vw for each row begin
	  update tbl set a=new.a, b=new.b where a = old.a;
	end;
	create trigger t_ins_tbl instead of insert on vw for each row begin
	  insert into tbl values (new.a,new.b);
	end;
	insert into tbl values(101,1001);
	insert into tbl values(102,1002);
	insert into tbl select a+2, b+2 from tbl;
	insert into tbl select a+4, b+4 from tbl;
	insert into tbl select a+8, b+8 from tbl;
	insert into tbl select a+16, b+16 from tbl;
	insert into tbl select a+32, b+32 from tbl;
	insert into tbl select a+64, b+64 from tbl;
	select count(*) from vw;
    }
} {128}
do_test trigger4-4.2 {
    execsql {select a, b from vw where a<103 or a>226 order by a}
} {101 1001 102 1002 227 1127 228 1128}

#test delete from view
do_test trigger4-5.1 {
    catchsql {delete from vw where a>101 and a<2000}
} {0 {}}
do_test trigger4-5.2 {
    execsql {select * from vw}
} {101 1001}

#test insert into view
do_test trigger4-6.1 {
    catchsql {
	insert into vw values(102,1002);
	insert into vw select a+2, b+2 from vw;
	insert into vw select a+4, b+4 from vw;
	insert into vw select a+8, b+8 from vw;
	insert into vw select a+16, b+16 from vw;
	insert into vw select a+32, b+32 from vw;
	insert into vw select a+64, b+64 from vw;
    }
} {0 {}}
do_test trigger4-6.2 {
    execsql {select count(*) from vw}
} {128}

#test update of view
do_test trigger4-7.1 {
    catchsql {update vw set b=b+1000 where a>101 and a<2000}
} {0 {}}
do_test trigger4-7.2 {
    execsql {select a, b from vw where a<=102 or a>=227 order by a}
} {101 1001 102 2002 227 2127 228 2128}

integrity_check trigger4-99.9
db close
forcedelete trigtest.db trigtest.db-journal

finish_test
