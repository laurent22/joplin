# 2018 January 30
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix zipfilefault

ifcapable !vtab {
  finish_test; return
}
if {[catch {load_static_extension db zipfile} error]} {
  puts "Skipping zipfile2 tests, hit load error: $error"
  finish_test; return
}

faultsim_save_and_close
do_faultsim_test 1 -prep {
  faultsim_restore_and_reopen
  load_static_extension db zipfile
  execsql { DROP TABLE IF EXISTS aaa }
} -body {
  execsql { CREATE VIRTUAL TABLE aaa USING zipfile('test.zip') }
} -test {
  faultsim_test_result {0 {}} 
}

forcedelete test.zip
sqlite3 db test.db
load_static_extension db zipfile
do_execsql_test 2.0 {
  CREATE VIRTUAL TABLE setup USING zipfile('test.zip');
  INSERT INTO setup(name, data) VALUES('a.txt', '1234567890');
}

do_faultsim_test 2.1 -faults oom* -body {
  execsql { SELECT name,data FROM zipfile('test.zip') }
} -test {
  faultsim_test_result {0 {a.txt 1234567890}} 
}
ifcapable json1 {
  do_faultsim_test 2.2 -faults oom* -body {
    execsql { 
      SELECT json_extract( zipfile_cds(z), '$.version-made-by' ) 
      FROM zipfile('test.zip')
    }
  } -test {
    faultsim_test_result {0 798}
  }
}

forcedelete test.zip
reset_db
load_static_extension db zipfile
do_execsql_test 3.0 {
  CREATE VIRTUAL TABLE setup USING zipfile('test.zip');
  INSERT INTO setup(name, data) VALUES('a.txt', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
}

do_faultsim_test 3 -faults oom* -body {
  execsql { SELECT name,data FROM zipfile('test.zip') }
} -test {
  faultsim_test_result {0 {a.txt aaaaaaaaaaaaaaaaaaaaaaaaaaaa}} 
}

do_faultsim_test 4 -faults oom* -body {
  execsql {
    WITH c(n, d) AS (
      SELECT 1, 'aaaaaaaaaaabbbbbbbbbbaaaaaaaaaabbbbbbbbbb'
    )
    SELECT name, data FROM zipfile(
      (SELECT zipfile(n, d) FROM c)
    );
  }
} -test {
  faultsim_test_result {0 {1 aaaaaaaaaaabbbbbbbbbbaaaaaaaaaabbbbbbbbbb}}
}

reset_db
sqlite3_db_config_lookaside db 0 0 0
load_static_extension db zipfile

do_execsql_test 5.0 {
  CREATE VIRTUAL TABLE setup USING zipfile('test.zip') 
}

do_faultsim_test 5.1 -faults oom* -prep {
  forcedelete test.zip
} -body {
  execsql {
    INSERT INTO setup(name, data) 
    VALUES('a.txt', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  }
} -test {
  faultsim_test_result {0 {}}
}

do_faultsim_test 5.2 -faults oom* -prep {
  forcedelete test.zip
} -body {
  execsql {
    INSERT INTO setup(name, data) VALUES('dir', NULL)
  }
} -test {
  faultsim_test_result {0 {}}
}

do_faultsim_test 5.3 -faults oom* -prep {
  forcedelete test.zip
  execsql { 
    DROP TABLE IF EXISTS setup;
    BEGIN;
      CREATE VIRTUAL TABLE setup USING zipfile('test.zip') 
  }
} -body {
  execsql {
    INSERT INTO setup(name, data) VALUES('dir', NULL)
  }
} -test {
  catchsql { COMMIT }
  faultsim_test_result {0 {}}
}

do_faultsim_test 6.1 -faults oom* -body {
  execsql {
    WITH c(n, d) AS (
      VALUES('a.txt', '1234567890') UNION ALL
      VALUES('dir', NULL)
    )
    SELECT zipfile(n, d) IS NULL FROM c;
  }
} -test {
  faultsim_test_result {0 0}
}

set big [string repeat 0123456789 1000]
do_faultsim_test 6.2 -faults oom* -body {
  execsql {
    WITH c(n, d) AS (
      VALUES('a.txt', $big)
    )
    SELECT zipfile(n, NULL, NULL, d, 0) IS NULL FROM c;
  }
} -test {
  faultsim_test_result {0 0}
}

do_faultsim_test 7.0 -faults oom* -prep {
  catch { db close }
  sqlite3 db ""
} -body {
  load_static_extension db zipfile
} -test {
}


finish_test
