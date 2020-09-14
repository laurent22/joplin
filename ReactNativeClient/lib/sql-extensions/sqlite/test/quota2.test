# 2011 December 1
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

# If SQLITE_CURDIR is not defined, omit this file.
ifcapable !curdir {
  finish_test
  return
}

source $testdir/malloc_common.tcl

db close
sqlite3_quota_initialize "" 1

foreach dir {quota2a/x1 quota2a/x2 quota2a quota2b quota2c} {
  forcedelete $dir
}
foreach dir {quota2a quota2a/x1 quota2a/x2 quota2b quota2c} {
  file mkdir $dir
}

# The standard_path procedure converts a pathname into a standard format
# that is the same across platforms.
#
unset -nocomplain ::quota_pwd ::quota_mapping
set ::quota_pwd [string map {\\ /} [get_pwd]]
set ::quota_mapping [list $::quota_pwd PWD]
proc standard_path {x} {
  set x [string map {\\ /} $x]
  return [string map $::quota_mapping $x]
}

# The quota_check procedure is a callback from the quota handler.
# It has three arguments which are (1) the full pathname of the file
# that has gone over quota, (2) the quota limit, (3) the requested
# new quota size to cover the last write.  These three values are
# appended to the global variable $::quota.  The filename is processed
# to convert every \ character into / and to change the name of the
# working directory to PWD.  
#
# The quota is increased to the request if the ::quota_request_ok 
# global variable is true.
#
set ::quota {}
set ::quota_request_ok 0

proc quota_check {filename limitvar size} {
  upvar $limitvar limit
  lappend ::quota [standard_path $filename] [set limit] $size
  if {$::quota_request_ok} {set limit $size}
}

sqlite3_quota_set */quota2a/* 4000 quota_check
sqlite3_quota_set */quota2b/* 5000 quota_check

unset -nocomplain bigtext
for {set i 1} {$i<=1000} {incr i} {
  if {$i%10==0} {
    append bigtext [format "%06d\n" $i]
  } else {
    append bigtext [format "%06d " $i]
  }
}

catch { unset h1 }
catch { unset x }
do_test quota2-1.1 {
  set ::h1 [sqlite3_quota_fopen quota2a/xyz.txt w+b]
  sqlite3_quota_fwrite $::h1 1 7000 $bigtext
} {4000}
do_test quota2-1.2 {
  set ::quota
} {PWD/quota2a/xyz.txt 4000 7000}
do_test quota2-1.2.1 {
  sqlite3_quota_file_size $::h1
} {4000}
do_test quota2-1.2.2 {
  sqlite3_quota_fflush $::h1 1
  sqlite3_quota_file_truesize $::h1
} {4000}
do_test quota2-1.3 {
  sqlite3_quota_rewind $::h1
  set ::x [sqlite3_quota_fread $::h1 1001 7]
  string length $::x
} {3003}
do_test quota2-1.4 {
  string match $::x [string range $::bigtext 0 3002]
} {1}
do_test quota2-1.5 {
  sqlite3_quota_fseek $::h1 0 SEEK_END
  sqlite3_quota_ftell $::h1
} {4000}
do_test quota2-1.6 {
  sqlite3_quota_fseek $::h1 -100 SEEK_END
  sqlite3_quota_ftell $::h1
} {3900}
do_test quota2-1.7 {
  sqlite3_quota_fseek $::h1 -100 SEEK_CUR
  sqlite3_quota_ftell $::h1
} {3800}
do_test quota2-1.8 {
  sqlite3_quota_fseek $::h1 50 SEEK_CUR
  sqlite3_quota_ftell $::h1
} {3850}
do_test quota2-1.9 {
  sqlite3_quota_fseek $::h1 50 SEEK_SET
  sqlite3_quota_ftell $::h1
} {50}
do_test quota2-1.10 {
  sqlite3_quota_rewind $::h1
  sqlite3_quota_ftell $::h1
} {0}
do_test quota2-1.11 {
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 4000 {PWD/quota2a/xyz.txt 4000 1 0}}}
do_test quota2-1.12 {
  sqlite3_quota_ftruncate $::h1 3500
  sqlite3_quota_file_size $::h1
} {3500}
do_test quota2-1.13 {
  sqlite3_quota_file_truesize $::h1
} {3500}
do_test quota2-1.14 {
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 3500 {PWD/quota2a/xyz.txt 3500 1 0}}}
do_test quota2-1.15 {
  sqlite3_quota_fseek $::h1 0 SEEK_END
  sqlite3_quota_ftell $::h1
} {3500}
do_test quota2-1.16 {
  sqlite3_quota_fwrite $::h1 1 7000 $bigtext
} {500}
do_test quota2-1.17 {
  sqlite3_quota_ftell $::h1
} {4000}
do_test quota2-1.18 {
  sqlite3_quota_file_size $::h1
} {4000}
do_test quota2-1.19 {
  sqlite3_quota_fflush $::h1 1
  sqlite3_quota_file_truesize $::h1
} {4000}
do_test quota2-1.20 {
  sqlite3_quota_fclose $::h1
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 4000 {PWD/quota2a/xyz.txt 4000 0 0}}}
do_test quota2-1.21 {
  sqlite3_quota_remove quota2a/xyz.txt
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 0}}



set quota {}
do_test quota2-2.1 {
  set ::h1 [sqlite3_quota_fopen quota2c/xyz.txt w+b]
  sqlite3_quota_fwrite $::h1 1 7000 $bigtext
} {7000}
do_test quota2-2.2 {
  set ::quota
} {}
do_test quota2-2.3.1 {
  sqlite3_quota_rewind $::h1
  sqlite3_quota_file_available $::h1
} {7000}
do_test quota2-2.3.2 {
  set ::x [sqlite3_quota_fread $::h1 1001 7]
  string length $::x
} {6006}
do_test quota2-2.3.3 {
  sqlite3_quota_file_available $::h1
} {0}
do_test quota2-2.4 {
  string match $::x [string range $::bigtext 0 6005]
} {1}
do_test quota2-2.5 {
  sqlite3_quota_fseek $::h1 0 SEEK_END
  sqlite3_quota_ftell $::h1
} {7000}
do_test quota2-2.6 {
  sqlite3_quota_fseek $::h1 -100 SEEK_END
  sqlite3_quota_ftell $::h1
} {6900}
do_test quota2-2.6.1 {
  sqlite3_quota_file_available $::h1
} {100}
do_test quota2-2.7 {
  sqlite3_quota_fseek $::h1 -100 SEEK_CUR
  sqlite3_quota_ftell $::h1
} {6800}
do_test quota2-2.7.1 {
  sqlite3_quota_file_available $::h1
} {200}
do_test quota2-2.8 {
  sqlite3_quota_fseek $::h1 50 SEEK_CUR
  sqlite3_quota_ftell $::h1
} {6850}
do_test quota2-2.8.1 {
  sqlite3_quota_file_available $::h1
} {150}
do_test quota2-2.9 {
  sqlite3_quota_fseek $::h1 50 SEEK_SET
  sqlite3_quota_ftell $::h1
} {50}
do_test quota2-2.9.1 {
  sqlite3_quota_file_available $::h1
} {6950}
do_test quota2-2.10 {
  sqlite3_quota_rewind $::h1
  sqlite3_quota_ftell $::h1
} {0}
do_test quota2-2.10.1 {
  sqlite3_quota_file_available $::h1
} {7000}
do_test quota2-2.10.2 {
  sqlite3_quota_ferror $::h1
} {0}
do_test quota2-2.11 {
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 0}}
do_test quota2-2.12 {
  sqlite3_quota_fclose $::h1
  standard_path [sqlite3_quota_dump]
} {{*/quota2b/* 5000 0} {*/quota2a/* 4000 0}}

do_test quota2-3.1 {
  sqlite3_quota_set */quota2b/* 0 quota_check
  set ::h1 [sqlite3_quota_fopen quota2a/x1/a.txt a]
  sqlite3_quota_fwrite $::h1 10 10 $bigtext
} {10}
do_test quota2-3.2 {
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 100 {PWD/quota2a/x1/a.txt 100 1 0}}}
do_test quota2-3.3a {
  sqlite3_quota_fflush $::h1 0
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 100 {PWD/quota2a/x1/a.txt 100 1 0}}}
do_test quota2-3.3b {
  sqlite3_quota_fflush $::h1 1
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 100 {PWD/quota2a/x1/a.txt 100 1 0}}}
do_test quota2-3.3c {
  sqlite3_quota_fflush $::h1
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 100 {PWD/quota2a/x1/a.txt 100 1 0}}}
do_test quota2-3.4 {
  sqlite3_quota_fclose $::h1
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 100 {PWD/quota2a/x1/a.txt 100 0 0}}}
do_test quota2-3.5 {
  set ::h2 [sqlite3_quota_fopen quota2a/x2/b.txt a]
  sqlite3_quota_fwrite $::h2 10 20 $bigtext
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 300 {PWD/quota2a/x2/b.txt 200 1 0} {PWD/quota2a/x1/a.txt 100 0 0}}}
do_test quota2-3.6 {
  set ::h3 [sqlite3_quota_fopen quota2a/x1/c.txt a]
  sqlite3_quota_fwrite $::h3 10 50 $bigtext
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 800 {PWD/quota2a/x1/c.txt 500 1 0} {PWD/quota2a/x2/b.txt 200 1 0} {PWD/quota2a/x1/a.txt 100 0 0}}}
do_test quota2-3.7 {
  file exists quota2a/x1/a.txt
} {1}
do_test quota2-3.8 {
  file exists quota2a/x2/b.txt
} {1}
do_test quota2-3.9 {
  file exists quota2a/x1/c.txt
} {1}
do_test quota2-3.10 {
  sqlite3_quota_remove quota2a/x1
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 700 {PWD/quota2a/x1/c.txt 500 1 1} {PWD/quota2a/x2/b.txt 200 1 0}}}
do_test quota2-3.11 {
  sqlite3_quota_fclose $::h2
  sqlite3_quota_fclose $::h3
  standard_path [sqlite3_quota_dump]
} {{*/quota2a/* 4000 200 {PWD/quota2a/x2/b.txt 200 0 0}}}
do_test quota2-3.12 {
  file exists quota2a/x1/a.txt
} {0}
do_test quota2-3.13 {
  file exists quota2a/x2/b.txt
} {1}
do_test quota2-3.14 {
  file exists quota2a/x1/c.txt
} {0}

catch { sqlite3_quota_shutdown }
catch { unset quota_request_ok }
finish_test
