# 2011 March 15
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
# This file checks to make sure SQLite is able to gracEFully
# handle malformed UTF-8.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc utf8_to_ustr2 {s} {
  set r ""
  foreach i [split $s ""] {
    scan $i %c c
    append r [format \\u%04.4X $c]
  }
  set r
}

proc utf8_to_hstr {in} {
 regsub -all -- {(..)} $in {%[format "%s" \1]} out
 subst $out
}

proc utf8_to_xstr {in} {
 regsub -all -- {(..)} $in {\\\\x[format "%s" \1]} out
 subst $out
}

proc utf8_to_ustr {in} {
 regsub -all -- {(..)} $in {\\\\u[format "%04.4X" 0x\1]} out
 subst $out
}

do_test badutf2-1.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval "PRAGMA encoding = 'UTF-8'"
} {}

do_test badutf2-4.0 {
  set S [sqlite3_prepare_v2 db "SELECT ?" -1 dummy]
  sqlite3_expired $S
} {0}
        
foreach { i len uval xstr ustr u2u } {
1 1 00     \x00         {}        {}
2 1 01     \x01         "\\u0001" 01
3 1 3F     \x3F         "\\u003F" 3F
4 1 7F     \x7F         "\\u007F" 7F
5 1 80     \x80         "\\u0080" C280
6 1 C3BF   \xFF         "\\u00FF" C3BF
7 3 EFBFBD \xEF\xBF\xBD "\\uFFFD" {}
} {

  set hstr [ utf8_to_hstr $uval ]

  ifcapable bloblit {
    if {$hstr != "%00"} {
      do_test badutf2-2.1.$i {
        set sql "SELECT '$hstr'=CAST(x'$uval' AS text) AS x;"
        set res [ sqlite3_exec db $sql ]
        lindex [ lindex $res 1] 1
      } {1}
      do_test badutf2-2.2.$i {
        set sql "SELECT CAST('$hstr' AS blob)=x'$uval' AS x;"
        set res [ sqlite3_exec db $sql ]
        lindex [ lindex $res 1] 1
      } {1}
    }
    do_test badutf2-2.3.$i {
      set sql "SELECT hex(CAST(x'$uval' AS text)) AS x;"
      set res [ sqlite3_exec db $sql ]
      lindex [ lindex $res 1] 1
    } $uval
    do_test badutf2-2.4.$i {
      set sql "SELECT hex(CAST(x'$uval' AS text)) AS x;"
      set res [ sqlite3_exec db $sql ]
      lindex [ lindex $res 1] 1
    } $uval
  }

  if {$hstr != "%00"} {
    do_test badutf2-3.1.$i {
      set sql "SELECT hex('$hstr') AS x;"
      set res [ sqlite3_exec db $sql ]
      lindex [ lindex $res 1] 1
    } $uval
  }

  # Tcl 8.7 and later do automatic bad-utf8 correction for
  # characters 0x80 thru 0x9f so test case 5 does not work here.
  if {$i==5 && $tcl_version>=8.7} {
     # no-op
  } else {
    do_test badutf2-4.1.$i {
      sqlite3_reset $S
      sqlite3_bind_text $S 1 $xstr $len
      sqlite3_step $S
      utf8_to_ustr2 [ sqlite3_column_text $S 0 ]
    } $ustr
  }

  ifcapable debug {
    do_test badutf2-5.1.$i {
      utf8_to_utf8 $uval
    } $u2u
  }

}

do_test badutf2-4.2 {
  sqlite3_finalize $S
} {SQLITE_OK}


finish_test
