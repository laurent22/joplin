# 2010 January 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
# Tests for the secure_delete pragma.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

unset -nocomplain DEFAULT_SECDEL
set DEFAULT_SECDEL 0
ifcapable fast_secure_delete {
  set DEFAULT_SECDEL 2
} else {
  ifcapable secure_delete {
    set DEFAULT_SECDEL 1
  }
}


do_test securedel-1.0 {
  db eval {PRAGMA secure_delete;}
} $DEFAULT_SECDEL

forcedelete test2.db test2.db-journal
do_test securedel-1.1 {
  db eval {
    ATTACH 'test2.db' AS db2;
    PRAGMA main.secure_delete=ON;
    PRAGMA db2.secure_delete;
  }
} [list 1 $DEFAULT_SECDEL]
do_test securedel-1.2 {
  db eval {
    PRAGMA main.secure_delete=OFF;
    PRAGMA db2.secure_delete;
  }
} [list 0 $DEFAULT_SECDEL]
do_test securedel-1.3 {
  db eval {
    PRAGMA secure_delete=OFF;
    PRAGMA db2.secure_delete;
  }
} {0 0}
do_test securedel-1.4 {
  db eval {
    PRAGMA secure_delete=ON;
    PRAGMA db2.secure_delete;
  }
} {1 1}
do_test securedel-1.5 {
  db eval {
    PRAGMA secure_delete=FAST;
    PRAGMA db2.secure_delete;
  }
} {2 2}
do_test securedel-1.6 {
  db eval {
    PRAGMA secure_delete=ON;
    PRAGMA db2.secure_delete;
  }
} {1 1}
do_test securedel-1.7 {
  db eval {
    PRAGMA main.secure_delete=FAST;
    PRAGMA db2.secure_delete;
  }
} {2 1}
do_test securedel-1.8 {
  db eval {
    PRAGMA main.secure_delete=ON;
    PRAGMA db2.secure_delete;
  }
} {1 1}

do_test securedel-2.1 {
  db eval {
    DETACH db2;
    ATTACH 'test2.db' AS db2;
    PRAGMA db2.secure_delete;
  }
} 1
do_test securedel-2.2 {
  db eval {
    DETACH db2;
    PRAGMA main.secure_delete=OFF;
    ATTACH 'test2.db' AS db2;
    PRAGMA db2.secure_delete;
  }
} {0 0}

finish_test
