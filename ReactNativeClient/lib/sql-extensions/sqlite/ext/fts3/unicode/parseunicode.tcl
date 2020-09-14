
#--------------------------------------------------------------------------
# Parameter $zName must be a path to the file UnicodeData.txt. This command
# reads the file and returns a list of mappings required to remove all
# diacritical marks from a unicode string. Each mapping is itself a list
# consisting of two elements - the unicode codepoint and the single ASCII
# character that it should be replaced with, or an empty string if the 
# codepoint should simply be removed from the input. Examples:
#
#   { 224 a  0 }     (replace codepoint 224 to "a")
#   { 769 "" 0 }     (remove codepoint 769 from input)
#
# Mappings are only returned for non-upper case codepoints. It is assumed
# that the input has already been folded to lower case.
#
# The third value in the list is always either 0 or 1. 0 if the 
# UnicodeData.txt file maps the codepoint to a single ASCII character and
# a diacritic, or 1 if the mapping is indirect. For example, consider the 
# two entries:
#
# 1ECD;LATIN SMALL LETTER O WITH DOT BELOW;Ll;0;L;006F 0323;;;;N;;;1ECC;;1ECC
# 1ED9;LATIN SMALL LETTER O WITH CIRCUMFLEX AND DOT BELOW;Ll;0;L;1ECD 0302;;;;N;;;1ED8;;1ED8
#
# The first codepoint is a direct mapping (as 006F is ASCII and 0323 is a 
# diacritic). The second is an indirect mapping, as it maps to the
# first codepoint plus 0302 (a diacritic).
#
proc rd_load_unicodedata_text {zName} {
  global tl_lookup_table

  set fd [open $zName]
  set lField {
    code
    character_name
    general_category
    canonical_combining_classes
    bidirectional_category
    character_decomposition_mapping
    decimal_digit_value
    digit_value
    numeric_value
    mirrored
    unicode_1_name
    iso10646_comment_field
    uppercase_mapping
    lowercase_mapping
    titlecase_mapping
  }
  set lRet [list]

  while { ![eof $fd] } {
    set line [gets $fd]
    if {$line == ""} continue

    set fields [split $line ";"]
    if {[llength $fields] != [llength $lField]} { error "parse error: $line" }
    foreach $lField $fields {}
    if { [llength $character_decomposition_mapping]!=2
      || [string is xdigit [lindex $character_decomposition_mapping 0]]==0
    } {
      continue
    }

    set iCode  [expr "0x$code"]
    set iAscii [expr "0x[lindex $character_decomposition_mapping 0]"]
    set iDia   [expr "0x[lindex $character_decomposition_mapping 1]"]

    # Filter out upper-case characters, as they will be mapped to their
    # lower-case equivalents before this data is used.
    if {[info exists tl_lookup_table($iCode)]} continue

    # Check if this is an indirect mapping. If so, set bIndirect to true
    # and change $iAscii to the indirectly mappped ASCII character.
    set bIndirect 0
    if {[info exists dia($iDia)] && [info exists mapping($iAscii)]} {
      set iAscii $mapping($iAscii)
      set bIndirect 1
    }

    if { ($iAscii >= 97 && $iAscii <= 122)
      || ($iAscii >= 65 && $iAscii <= 90)
    } {
      lappend lRet [list $iCode [string tolower [format %c $iAscii]] $bIndirect]
      set mapping($iCode) $iAscii
      set dia($iDia) 1
    }
  }

  foreach d [array names dia] {
    lappend lRet [list $d "" 0]
  }
  set lRet [lsort -integer -index 0 $lRet]

  close $fd
  set lRet
}

#-------------------------------------------------------------------------
# Parameter $zName must be a path to the file UnicodeData.txt. This command
# reads the file and returns a list of codepoints (integers). The list
# contains all codepoints in the UnicodeData.txt assigned to any "General
# Category" that is not a "Letter" or "Number".
#
proc an_load_unicodedata_text {zName} {
  set fd [open $zName]
  set lField {
    code
    character_name
    general_category
    canonical_combining_classes
    bidirectional_category
    character_decomposition_mapping
    decimal_digit_value
    digit_value
    numeric_value
    mirrored
    unicode_1_name
    iso10646_comment_field
    uppercase_mapping
    lowercase_mapping
    titlecase_mapping
  }
  set lRet [list]

  while { ![eof $fd] } {
    set line [gets $fd]
    if {$line == ""} continue

    set fields [split $line ";"]
    if {[llength $fields] != [llength $lField]} { error "parse error: $line" }
    foreach $lField $fields {}

    set iCode [expr "0x$code"]
    set bAlnum [expr {
         [lsearch {L N} [string range $general_category 0 0]] >= 0
      || $general_category=="Co"
    }]

    if { !$bAlnum } { lappend lRet $iCode }
  }

  close $fd
  set lRet
}

proc tl_load_casefolding_txt {zName} {
  global tl_lookup_table

  set fd [open $zName]
  while { ![eof $fd] } {
    set line [gets $fd]
    if {[string range $line 0 0] == "#"} continue
    if {$line == ""} continue

    foreach x {a b c d} {unset -nocomplain $x}
    foreach {a b c d} [split $line ";"] {}

    set a2 [list]
    set c2 [list]
    foreach elem $a { lappend a2 [expr "0x[string trim $elem]"] }
    foreach elem $c { lappend c2 [expr "0x[string trim $elem]"] }
    set b [string trim $b]
    set d [string trim $d]

    if {$b=="C" || $b=="S"} { set tl_lookup_table($a2) $c2 }
  }
}

proc cc_load_unicodedata_text {zName} {
  set fd [open $zName]
  set lField {
    code
    character_name
    general_category
    canonical_combining_classes
    bidirectional_category
    character_decomposition_mapping
    decimal_digit_value
    digit_value
    numeric_value
    mirrored
    unicode_1_name
    iso10646_comment_field
    uppercase_mapping
    lowercase_mapping
    titlecase_mapping
  }
  set lRet [list]

  while { ![eof $fd] } {
    set line [gets $fd]
    if {$line == ""} continue

    set fields [split $line ";"]
    if {[llength $fields] != [llength $lField]} { error "parse error: $line" }
    foreach $lField $fields {}

    lappend lRet [list $code $general_category]
  }

  close $fd
  set lRet
}


