# 2010 January 7
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements utility functions for SQLite library.
#
# This file attempts to restore the header of a journal.
# This may be useful for rolling-back the last committed 
# transaction from a recovered journal.
#

package require sqlite3

set parm_error 0
set fix_chksums 0
set dump_pages 0
set db_name ""

for {set i 0} {$i<$argc} {incr i} {
  if {[lindex $argv $i] == "-fix_chksums"} {
    set fix_chksums -1
  } elseif {[lindex $argv $i] == "-dump_pages"} {
    set dump_pages -1
  } elseif {$db_name == ""} {
    set db_name [lindex $argv $i]
    set jrnl_name $db_name-journal
  } else {
    set parm_error -1
  }
}
if {$parm_error || $db_name == ""} {
  puts "USAGE: restore_jrnl.tcl \[-fix_chksums\] \[-dump_pages\] db_name"
  puts "Example: restore_jrnl.tcl foo.sqlite"
  return
}

# is there a way to determine this?
set sectsz 512

# Copy file $from into $to
#
proc copy_file {from to} {
  file copy -force $from $to
}

# Execute some SQL
#
proc catchsql {sql} {
  set rc [catch {uplevel [list db eval $sql]} msg]
  list $rc $msg
}

# Perform a test
#
proc do_test {name cmd expected} {
  puts -nonewline "$name ..."
  set res [uplevel $cmd]
  if {$res eq $expected} {
    puts Ok
  } else {
    puts Error
    puts "  Got: $res"
    puts "  Expected: $expected"
  }
}

# Calc checksum nonce from journal page data.
#
proc calc_nonce {jrnl_pgno} {
  global sectsz
  global db_pgsz
  global jrnl_name
  set jrnl_pg_offset [expr $sectsz+((4+$db_pgsz+4)*$jrnl_pgno)]
  set nonce [hexio_get_int [hexio_read $jrnl_name [expr $jrnl_pg_offset+4+$db_pgsz] 4]]
  for {set i [expr $db_pgsz-200]} {$i>0} {set i [expr $i-200]} {
    set byte [hexio_get_int [hexio_read $jrnl_name [expr $jrnl_pg_offset+4+$i] 1]]
    set nonce [expr $nonce-$byte]
  }
  return $nonce
}

# Calc checksum from journal page data.
#
proc calc_chksum {jrnl_pgno} {
  global sectsz
  global db_pgsz
  global jrnl_name
  global nonce
  set jrnl_pg_offset [expr $sectsz+((4+$db_pgsz+4)*$jrnl_pgno)]
  set chksum $nonce
  for {set i [expr $db_pgsz-200]} {$i>0} {set i [expr $i-200]} {
    set byte [hexio_get_int [hexio_read $jrnl_name [expr $jrnl_pg_offset+4+$i] 1]]
    set chksum [expr $chksum+$byte]
  }
  return $chksum
}

# Print journal page data in hex dump form
#
proc dump_jrnl_page {jrnl_pgno} {
  global sectsz
  global db_pgsz
  global jrnl_name

  # print a header block for the page
  puts [string repeat "-" 79]
  set jrnl_pg_offset [expr $sectsz+((4+$db_pgsz+4)*$jrnl_pgno)]
  set db_pgno [hexio_get_int [hexio_read $jrnl_name [expr $jrnl_pg_offset] 4]]
  set chksum [hexio_get_int [hexio_read $jrnl_name [expr $jrnl_pg_offset+4+$db_pgsz] 4]]
  set nonce [calc_nonce $jrnl_pgno]
  puts [ format {jrnl_pg_offset: %08x (%d)  jrnl_pgno: %d  db_pgno: %d} \
      $jrnl_pg_offset $jrnl_pg_offset \
      $jrnl_pgno $db_pgno]
  puts [ format {nonce: %08x chksum: %08x} \
      $nonce $chksum]

  # now hex dump the data
  # This is derived from the Tcler's WIKI
  set fid [open $jrnl_name r]
  fconfigure $fid -translation binary -encoding binary
  seek $fid [expr $jrnl_pg_offset+4]
  set data [read $fid $db_pgsz]
  close $fid
  for {set addr 0} {$addr<$db_pgsz} {set addr [expr $addr+16]} {
    # get 16 bytes of data
    set s [string range $data $addr [expr $addr+16]]
    
    # Convert the data to hex and to characters.
    binary scan $s H*@0a* hex ascii

    # Replace non-printing characters in the data.
    regsub -all -- {[^[:graph:] ]} $ascii {.} ascii

    # Split the 16 bytes into two 8-byte chunks
    regexp -- {(.{16})(.{0,16})} $hex -> hex1 hex2

    # Convert the hex to pairs of hex digits
    regsub -all -- {..} $hex1 {& } hex1
    regsub -all -- {..} $hex2 {& } hex2

    # Print the hex and ascii data
    puts [ format {%08x %-24s %-24s %-16s} \
        $addr $hex1 $hex2 $ascii ]
  }
}

# Setup for the tests.  Make a backup copy of the files.
#
if [file exist $db_name.org] {
  puts "ERROR: during back-up: $db_name.org exists already."
  return;
}
if [file exist $jrnl_name.org] {
  puts "ERROR: during back-up: $jrnl_name.org exists already."
  return
}
copy_file $db_name $db_name.org
copy_file $jrnl_name $jrnl_name.org

set db_fsize [file size $db_name]
set db_pgsz [hexio_get_int [hexio_read $db_name 16 2]]
set db_npage [expr {$db_fsize / $db_pgsz}]

set jrnl_fsize [file size $jrnl_name]
set jrnl_npage [expr {($jrnl_fsize - $sectsz) / (4 + $db_pgsz + 4)}]

# calculate checksum nonce for first page
set nonce [calc_nonce 0]

# verify all the pages in the journal use the same nonce
for {set i 1} {$i<$jrnl_npage} {incr i} {
  set tnonce [calc_nonce $i]
  if {$tnonce != $nonce} {
    puts "WARNING: different nonces: 0=$nonce $i=$tnonce"
    if {$fix_chksums } {
      set jrnl_pg_offset [expr $sectsz+((4+$db_pgsz+4)*$i)]
      set tchksum [calc_chksum $i]
      hexio_write $jrnl_name [expr $jrnl_pg_offset+4+$db_pgsz] [format %08x $tchksum]
      puts "INFO: fixing chksum: $i=$tchksum"
    }
  }
}

# verify all the page numbers in the journal
for {set i 0} {$i<$jrnl_npage} {incr i} {
  set jrnl_pg_offset [expr $sectsz+((4+$db_pgsz+4)*$i)]
  set db_pgno [hexio_get_int [hexio_read $jrnl_name $jrnl_pg_offset 4]]
  if {$db_pgno < 1} {
    puts "WARNING: page number < 1: $i=$db_pgno"
  }
  if {$db_pgno >= $db_npage} {
    puts "WARNING: page number >= $db_npage: $i=$db_pgno"
  }
}

# dump page data
if {$dump_pages} {
  for {set i 0} {$i<$jrnl_npage} {incr i} {
    dump_jrnl_page $i
  }
}

# write the 8 byte magic string
hexio_write $jrnl_name 0 d9d505f920a163d7

# write -1 for number of records
hexio_write $jrnl_name 8 ffffffff

# write 00 for checksum nonce
hexio_write $jrnl_name 12 [format %08x $nonce]

# write page count
hexio_write $jrnl_name 16 [format %08x $db_npage]

# write sector size
hexio_write $jrnl_name 20 [format %08x $sectsz]

# write page size
hexio_write $jrnl_name 24 [format %08x $db_pgsz]

# check the integrity of the database with the patched journal
sqlite3 db $db_name
do_test restore_jrnl-1.0 {
  catchsql {PRAGMA integrity_check}
} {0 ok}
db close

