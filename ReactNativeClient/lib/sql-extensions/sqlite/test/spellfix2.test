# 2012 July 12
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
set testprefix spellfix2

ifcapable !vtab { finish_test ; return }
load_static_extension db spellfix nextchar

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE demo USING spellfix1;
  INSERT INTO demo(word) VALUES ('amsterdam');
  INSERT INTO demo(word) VALUES ('amsterdammetje');
  INSERT INTO demo(word) VALUES ('amsterdamania');
  INSERT INTO demo(word) VALUES ('amsterdamweg');
  INSERT INTO demo(word) VALUES ('amsterdamsestraat');
  INSERT INTO demo(word) VALUES ('amsterdamlaan');
}

do_execsql_test 1.1 {
  SELECT word, distance, matchlen FROM demo 
  WHERE word MATCH 'amstedam*' AND top=3
  ORDER BY +word;
} {
   amsterdam      100 9
   amsterdamania  100 9
   amsterdammetje 100 9
}

do_execsql_test 1.2 {
  SELECT word, distance, matchlen FROM demo WHERE 
  word MATCH 'amstedam*' AND top=3 AND distance <= 100
  ORDER BY +word;
} {
   amsterdam      100 9
   amsterdamania  100 9
   amsterdammetje 100 9
}

do_execsql_test 1.3 {
  SELECT word, distance, matchlen FROM demo WHERE 
  word MATCH 'amstedam*' AND distance <= 100
  ORDER BY +word;
} {
   amsterdam         100 9
   amsterdamania     100 9
   amsterdamlaan     100 9
   amsterdammetje    100 9
   amsterdamsestraat 100 9
   amsterdamweg      100 9
}

do_test 1.4 {
  foreach l {a b c d e f g h i j k l m n o p q r s t u v w x y z} {
    execsql { INSERT INTO demo(word) VALUES ('amsterdam' || $l) }
  }
} {}

do_execsql_test 1.5 {
  SELECT count(*) FROM demo WHERE word MATCH 'amstedam*' AND distance <= 100;
  SELECT count(*) FROM demo 
  WHERE word MATCH 'amstedam*' AND distance <= 100 AND top=20;
} {
  32 20
}

do_execsql_test 1.6 {
  SELECT word, distance, matchlen FROM demo 
  WHERE word MATCH 'amstedam*' AND distance <= 100
  ORDER BY distance, word;
} {
  amsterdam         100 9        amsterdama        100 9
  amsterdamania     100 9        amsterdamb        100 9
  amsterdamc        100 9        amsterdamd        100 9
  amsterdame        100 9        amsterdamf        100 9
  amsterdamg        100 9        amsterdamh        100 9
  amsterdami        100 9        amsterdamj        100 9
  amsterdamk        100 9        amsterdaml        100 9
  amsterdamlaan     100 9        amsterdamm        100 9
  amsterdammetje    100 9        amsterdamn        100 9
  amsterdamo        100 9        amsterdamp        100 9
  amsterdamq        100 9        amsterdamr        100 9
  amsterdams        100 9        amsterdamsestraat 100 9
  amsterdamt        100 9        amsterdamu        100 9
  amsterdamv        100 9        amsterdamw        100 9
  amsterdamweg      100 9        amsterdamx        100 9
  amsterdamy        100 9        amsterdamz        100 9
}

do_execsql_test 1.7 {
  SELECT word, distance, matchlen FROM demo 
  WHERE word MATCH 'amstedam*' AND distance <= 100 AND top=20
  ORDER BY distance, word;
} {
  amsterdam         100 9        amsterdama        100 9
  amsterdamania     100 9        amsterdamb        100 9
  amsterdamc        100 9        amsterdame        100 9
  amsterdamf        100 9        amsterdamg        100 9
  amsterdamh        100 9        amsterdami        100 9
  amsterdamm        100 9        amsterdammetje    100 9
  amsterdamn        100 9        amsterdamo        100 9
  amsterdamp        100 9        amsterdamu        100 9
  amsterdamv        100 9        amsterdamw        100 9
  amsterdamweg      100 9        amsterdamy        100 9
}


finish_test
