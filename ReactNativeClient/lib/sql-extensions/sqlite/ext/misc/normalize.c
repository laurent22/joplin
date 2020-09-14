/*
** 2018-01-08
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This file contains code to implement the sqlite3_normalize() function.
**
**    char *sqlite3_normalize(const char *zSql);
**
** This function takes an SQL string as input and returns a "normalized"
** version of that string in memory obtained from sqlite3_malloc64().  The
** caller is responsible for ensuring that the returned memory is freed.
**
** If a memory allocation error occurs, this routine returns NULL.
**
** The normalization consists of the following transformations:
**
**   (1)  Convert every literal (string, blob literal, numeric constant,
**        or "NULL" constant) into a ?
**
**   (2)  Remove all superfluous whitespace, including comments.  Change
**        all required whitespace to a single space character.
**
**   (3)  Lowercase all ASCII characters.
**
**   (4)  If an IN or NOT IN operator is followed by a list of 1 or more
**        values, convert that list into "(?,?,?)".
**
** The purpose of normalization is two-fold:
**
**   (1)  Sanitize queries by removing potentially private or sensitive
**        information contained in literals.
**
**   (2)  Identify structurally identical queries by comparing their
**        normalized forms.
**
** Command-Line Utility
** --------------------
**
** This file also contains code for a command-line utility that converts
** SQL queries in text files into their normalized forms.  To build the
** command-line program, compile this file with -DSQLITE_NORMALIZE_CLI
** and link it against the SQLite library.
*/
#include <sqlite3.h>
#include <string.h>

/*
** Implementation note:
**
** Much of the tokenizer logic is copied out of the tokenize.c source file
** of SQLite.  That logic could be simplified for this particular application,
** but that would impose a risk of introducing subtle errors.  It is best to
** keep the code as close to the original as possible.
**
** The tokenize code is in sync with the SQLite core as of 2018-01-08.
** Any future changes to the core tokenizer might require corresponding
** adjustments to the tokenizer logic in this module.
*/


/* Character classes for tokenizing
**
** In the sqlite3GetToken() function, a switch() on aiClass[c] is implemented
** using a lookup table, whereas a switch() directly on c uses a binary search.
** The lookup table is much faster.  To maximize speed, and to ensure that
** a lookup table is used, all of the classes need to be small integers and
** all of them need to be used within the switch.
*/
#define CC_X          0    /* The letter 'x', or start of BLOB literal */
#define CC_KYWD       1    /* Alphabetics or '_'.  Usable in a keyword */
#define CC_ID         2    /* unicode characters usable in IDs */
#define CC_DIGIT      3    /* Digits */
#define CC_DOLLAR     4    /* '$' */
#define CC_VARALPHA   5    /* '@', '#', ':'.  Alphabetic SQL variables */
#define CC_VARNUM     6    /* '?'.  Numeric SQL variables */
#define CC_SPACE      7    /* Space characters */
#define CC_QUOTE      8    /* '"', '\'', or '`'.  String literals, quoted ids */
#define CC_QUOTE2     9    /* '['.   [...] style quoted ids */
#define CC_PIPE      10    /* '|'.   Bitwise OR or concatenate */
#define CC_MINUS     11    /* '-'.  Minus or SQL-style comment */
#define CC_LT        12    /* '<'.  Part of < or <= or <> */
#define CC_GT        13    /* '>'.  Part of > or >= */
#define CC_EQ        14    /* '='.  Part of = or == */
#define CC_BANG      15    /* '!'.  Part of != */
#define CC_SLASH     16    /* '/'.  / or c-style comment */
#define CC_LP        17    /* '(' */
#define CC_RP        18    /* ')' */
#define CC_SEMI      19    /* ';' */
#define CC_PLUS      20    /* '+' */
#define CC_STAR      21    /* '*' */
#define CC_PERCENT   22    /* '%' */
#define CC_COMMA     23    /* ',' */
#define CC_AND       24    /* '&' */
#define CC_TILDA     25    /* '~' */
#define CC_DOT       26    /* '.' */
#define CC_ILLEGAL   27    /* Illegal character */

static const unsigned char aiClass[] = {
/*         x0  x1  x2  x3  x4  x5  x6  x7  x8  x9  xa  xb  xc  xd  xe  xf */
/* 0x */   27, 27, 27, 27, 27, 27, 27, 27, 27,  7,  7, 27,  7,  7, 27, 27,
/* 1x */   27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27,
/* 2x */    7, 15,  8,  5,  4, 22, 24,  8, 17, 18, 21, 20, 23, 11, 26, 16,
/* 3x */    3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  5, 19, 12, 14, 13,  6,
/* 4x */    5,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
/* 5x */    1,  1,  1,  1,  1,  1,  1,  1,  0,  1,  1,  9, 27, 27, 27,  1,
/* 6x */    8,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
/* 7x */    1,  1,  1,  1,  1,  1,  1,  1,  0,  1,  1, 27, 10, 27, 25, 27,
/* 8x */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* 9x */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Ax */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Bx */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Cx */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Dx */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Ex */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
/* Fx */    2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2
};

/* An array to map all upper-case characters into their corresponding
** lower-case character. 
**
** SQLite only considers US-ASCII (or EBCDIC) characters.  We do not
** handle case conversions for the UTF character set since the tables
** involved are nearly as big or bigger than SQLite itself.
*/
static const unsigned char sqlite3UpperToLower[] = {
      0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17,
     18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
     36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
     54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 97, 98, 99,100,101,102,103,
    104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
    122, 91, 92, 93, 94, 95, 96, 97, 98, 99,100,101,102,103,104,105,106,107,
    108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,
    126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,
    144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,
    162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,
    180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,
    198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,
    216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,
    234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,
    252,253,254,255
};

/*
** The following 256 byte lookup table is used to support SQLites built-in
** equivalents to the following standard library functions:
**
**   isspace()                        0x01
**   isalpha()                        0x02
**   isdigit()                        0x04
**   isalnum()                        0x06
**   isxdigit()                       0x08
**   toupper()                        0x20
**   SQLite identifier character      0x40
**   Quote character                  0x80
**
** Bit 0x20 is set if the mapped character requires translation to upper
** case. i.e. if the character is a lower-case ASCII character.
** If x is a lower-case ASCII character, then its upper-case equivalent
** is (x - 0x20). Therefore toupper() can be implemented as:
**
**   (x & ~(map[x]&0x20))
**
** The equivalent of tolower() is implemented using the sqlite3UpperToLower[]
** array. tolower() is used more often than toupper() by SQLite.
**
** Bit 0x40 is set if the character is non-alphanumeric and can be used in an 
** SQLite identifier.  Identifiers are alphanumerics, "_", "$", and any
** non-ASCII UTF character. Hence the test for whether or not a character is
** part of an identifier is 0x46.
*/
static const unsigned char sqlite3CtypeMap[256] = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 00..07    ........ */
  0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00,  /* 08..0f    ........ */
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 10..17    ........ */
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 18..1f    ........ */
  0x01, 0x00, 0x80, 0x00, 0x40, 0x00, 0x00, 0x80,  /* 20..27     !"#$%&' */
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 28..2f    ()*+,-./ */
  0x0c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c,  /* 30..37    01234567 */
  0x0c, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 38..3f    89:;<=>? */

  0x00, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x02,  /* 40..47    @ABCDEFG */
  0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,  /* 48..4f    HIJKLMNO */
  0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,  /* 50..57    PQRSTUVW */
  0x02, 0x02, 0x02, 0x80, 0x00, 0x00, 0x00, 0x40,  /* 58..5f    XYZ[\]^_ */
  0x80, 0x2a, 0x2a, 0x2a, 0x2a, 0x2a, 0x2a, 0x22,  /* 60..67    `abcdefg */
  0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,  /* 68..6f    hijklmno */
  0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,  /* 70..77    pqrstuvw */
  0x22, 0x22, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00,  /* 78..7f    xyz{|}~. */

  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* 80..87    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* 88..8f    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* 90..97    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* 98..9f    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* a0..a7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* a8..af    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* b0..b7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* b8..bf    ........ */

  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* c0..c7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* c8..cf    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* d0..d7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* d8..df    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* e0..e7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* e8..ef    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40,  /* f0..f7    ........ */
  0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40   /* f8..ff    ........ */
};
#define sqlite3Toupper(x)   ((x)&~(sqlite3CtypeMap[(unsigned char)(x)]&0x20))
#define sqlite3Isspace(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x01)
#define sqlite3Isalnum(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x06)
#define sqlite3Isalpha(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x02)
#define sqlite3Isdigit(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x04)
#define sqlite3Isxdigit(x)  (sqlite3CtypeMap[(unsigned char)(x)]&0x08)
#define sqlite3Tolower(x)   (sqlite3UpperToLower[(unsigned char)(x)])
#define sqlite3Isquote(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x80)


/*
** If X is a character that can be used in an identifier then
** IdChar(X) will be true.  Otherwise it is false.
**
** For ASCII, any character with the high-order bit set is
** allowed in an identifier.  For 7-bit characters, 
** sqlite3IsIdChar[X] must be 1.
**
** For EBCDIC, the rules are more complex but have the same
** end result.
**
** Ticket #1066.  the SQL standard does not allow '$' in the
** middle of identifiers.  But many SQL implementations do. 
** SQLite will allow '$' in identifiers for compatibility.
** But the feature is undocumented.
*/
#define IdChar(C)  ((sqlite3CtypeMap[(unsigned char)C]&0x46)!=0)

/*
** Ignore testcase() macros
*/
#define testcase(X)

/*
** Token values
*/
#define TK_SPACE    0
#define TK_NAME     1
#define TK_LITERAL  2
#define TK_PUNCT    3
#define TK_ERROR    4

#define TK_MINUS    TK_PUNCT
#define TK_LP       TK_PUNCT
#define TK_RP       TK_PUNCT
#define TK_SEMI     TK_PUNCT
#define TK_PLUS     TK_PUNCT
#define TK_STAR     TK_PUNCT
#define TK_SLASH    TK_PUNCT
#define TK_REM      TK_PUNCT
#define TK_EQ       TK_PUNCT
#define TK_LE       TK_PUNCT
#define TK_NE       TK_PUNCT
#define TK_LSHIFT   TK_PUNCT
#define TK_LT       TK_PUNCT
#define TK_GE       TK_PUNCT
#define TK_RSHIFT   TK_PUNCT
#define TK_GT       TK_PUNCT
#define TK_GE       TK_PUNCT
#define TK_BITOR    TK_PUNCT
#define TK_CONCAT   TK_PUNCT
#define TK_COMMA    TK_PUNCT
#define TK_BITAND   TK_PUNCT
#define TK_BITNOT   TK_PUNCT
#define TK_STRING   TK_LITERAL
#define TK_ID       TK_NAME
#define TK_ILLEGAL  TK_ERROR
#define TK_DOT      TK_PUNCT
#define TK_INTEGER  TK_LITERAL
#define TK_FLOAT    TK_LITERAL
#define TK_VARIABLE TK_LITERAL
#define TK_BLOB     TK_LITERAL

/* Disable nuisence warnings about case fall-through */
#if !defined(deliberate_fall_through) && defined(__GCC__) && __GCC__>=7
# define deliberate_fall_through __attribute__((fallthrough));
#else
# define deliberate_fall_through
#endif

/*
** Return the length (in bytes) of the token that begins at z[0]. 
** Store the token type in *tokenType before returning.
*/
static int sqlite3GetToken(const unsigned char *z, int *tokenType){
  int i, c;
  switch( aiClass[*z] ){  /* Switch on the character-class of the first byte
                          ** of the token. See the comment on the CC_ defines
                          ** above. */
    case CC_SPACE: {
      for(i=1; sqlite3Isspace(z[i]); i++){}
      *tokenType = TK_SPACE;
      return i;
    }
    case CC_MINUS: {
      if( z[1]=='-' ){
        for(i=2; (c=z[i])!=0 && c!='\n'; i++){}
        *tokenType = TK_SPACE;
        return i;
      }
      *tokenType = TK_MINUS;
      return 1;
    }
    case CC_LP: {
      *tokenType = TK_LP;
      return 1;
    }
    case CC_RP: {
      *tokenType = TK_RP;
      return 1;
    }
    case CC_SEMI: {
      *tokenType = TK_SEMI;
      return 1;
    }
    case CC_PLUS: {
      *tokenType = TK_PLUS;
      return 1;
    }
    case CC_STAR: {
      *tokenType = TK_STAR;
      return 1;
    }
    case CC_SLASH: {
      if( z[1]!='*' || z[2]==0 ){
        *tokenType = TK_SLASH;
        return 1;
      }
      for(i=3, c=z[2]; (c!='*' || z[i]!='/') && (c=z[i])!=0; i++){}
      if( c ) i++;
      *tokenType = TK_SPACE;
      return i;
    }
    case CC_PERCENT: {
      *tokenType = TK_REM;
      return 1;
    }
    case CC_EQ: {
      *tokenType = TK_EQ;
      return 1 + (z[1]=='=');
    }
    case CC_LT: {
      if( (c=z[1])=='=' ){
        *tokenType = TK_LE;
        return 2;
      }else if( c=='>' ){
        *tokenType = TK_NE;
        return 2;
      }else if( c=='<' ){
        *tokenType = TK_LSHIFT;
        return 2;
      }else{
        *tokenType = TK_LT;
        return 1;
      }
    }
    case CC_GT: {
      if( (c=z[1])=='=' ){
        *tokenType = TK_GE;
        return 2;
      }else if( c=='>' ){
        *tokenType = TK_RSHIFT;
        return 2;
      }else{
        *tokenType = TK_GT;
        return 1;
      }
    }
    case CC_BANG: {
      if( z[1]!='=' ){
        *tokenType = TK_ILLEGAL;
        return 1;
      }else{
        *tokenType = TK_NE;
        return 2;
      }
    }
    case CC_PIPE: {
      if( z[1]!='|' ){
        *tokenType = TK_BITOR;
        return 1;
      }else{
        *tokenType = TK_CONCAT;
        return 2;
      }
    }
    case CC_COMMA: {
      *tokenType = TK_COMMA;
      return 1;
    }
    case CC_AND: {
      *tokenType = TK_BITAND;
      return 1;
    }
    case CC_TILDA: {
      *tokenType = TK_BITNOT;
      return 1;
    }
    case CC_QUOTE: {
      int delim = z[0];
      testcase( delim=='`' );
      testcase( delim=='\'' );
      testcase( delim=='"' );
      for(i=1; (c=z[i])!=0; i++){
        if( c==delim ){
          if( z[i+1]==delim ){
            i++;
          }else{
            break;
          }
        }
      }
      if( c=='\'' ){
        *tokenType = TK_STRING;
        return i+1;
      }else if( c!=0 ){
        *tokenType = TK_ID;
        return i+1;
      }else{
        *tokenType = TK_ILLEGAL;
        return i;
      }
    }
    case CC_DOT: {
      if( !sqlite3Isdigit(z[1]) ){
        *tokenType = TK_DOT;
        return 1;
      }
      /* If the next character is a digit, this is a floating point
      ** number that begins with ".".  Fall thru into the next case */
      /* no break */ deliberate_fall_through
    }
    case CC_DIGIT: {
      *tokenType = TK_INTEGER;
      if( z[0]=='0' && (z[1]=='x' || z[1]=='X') && sqlite3Isxdigit(z[2]) ){
        for(i=3; sqlite3Isxdigit(z[i]); i++){}
        return i;
      }
      for(i=0; sqlite3Isdigit(z[i]); i++){}
      if( z[i]=='.' ){
        i++;
        while( sqlite3Isdigit(z[i]) ){ i++; }
        *tokenType = TK_FLOAT;
      }
      if( (z[i]=='e' || z[i]=='E') &&
           ( sqlite3Isdigit(z[i+1]) 
            || ((z[i+1]=='+' || z[i+1]=='-') && sqlite3Isdigit(z[i+2]))
           )
      ){
        i += 2;
        while( sqlite3Isdigit(z[i]) ){ i++; }
        *tokenType = TK_FLOAT;
      }
      while( IdChar(z[i]) ){
        *tokenType = TK_ILLEGAL;
        i++;
      }
      return i;
    }
    case CC_QUOTE2: {
      for(i=1, c=z[0]; c!=']' && (c=z[i])!=0; i++){}
      *tokenType = c==']' ? TK_ID : TK_ILLEGAL;
      return i;
    }
    case CC_VARNUM: {
      *tokenType = TK_VARIABLE;
      for(i=1; sqlite3Isdigit(z[i]); i++){}
      return i;
    }
    case CC_DOLLAR:
    case CC_VARALPHA: {
      int n = 0;
      testcase( z[0]=='$' );  testcase( z[0]=='@' );
      testcase( z[0]==':' );  testcase( z[0]=='#' );
      *tokenType = TK_VARIABLE;
      for(i=1; (c=z[i])!=0; i++){
        if( IdChar(c) ){
          n++;
        }else if( c=='(' && n>0 ){
          do{
            i++;
          }while( (c=z[i])!=0 && !sqlite3Isspace(c) && c!=')' );
          if( c==')' ){
            i++;
          }else{
            *tokenType = TK_ILLEGAL;
          }
          break;
        }else if( c==':' && z[i+1]==':' ){
          i++;
        }else{
          break;
        }
      }
      if( n==0 ) *tokenType = TK_ILLEGAL;
      return i;
    }
    case CC_KYWD: {
      for(i=1; aiClass[z[i]]<=CC_KYWD; i++){}
      if( IdChar(z[i]) ){
        /* This token started out using characters that can appear in keywords,
        ** but z[i] is a character not allowed within keywords, so this must
        ** be an identifier instead */
        i++;
        break;
      }
      *tokenType = TK_ID;
      return i;
    }
    case CC_X: {
      testcase( z[0]=='x' ); testcase( z[0]=='X' );
      if( z[1]=='\'' ){
        *tokenType = TK_BLOB;
        for(i=2; sqlite3Isxdigit(z[i]); i++){}
        if( z[i]!='\'' || i%2 ){
          *tokenType = TK_ILLEGAL;
          while( z[i] && z[i]!='\'' ){ i++; }
        }
        if( z[i] ) i++;
        return i;
      }
      /* If it is not a BLOB literal, then it must be an ID, since no
      ** SQL keywords start with the letter 'x'.  Fall through */
      /* no break */ deliberate_fall_through
    }
    case CC_ID: {
      i = 1;
      break;
    }
    default: {
      *tokenType = TK_ILLEGAL;
      return 1;
    }
  }
  while( IdChar(z[i]) ){ i++; }
  *tokenType = TK_ID;
  return i;
}

char *sqlite3_normalize(const char *zSql){
  char *z;              /* The output string */
  sqlite3_int64 nZ;     /* Size of the output string in bytes */
  sqlite3_int64 nSql;   /* Size of the input string in bytes */
  int i;                /* Next character to read from zSql[] */
  int j;                /* Next slot to fill in on z[] */
  int tokenType;        /* Type of the next token */
  int n;                /* Size of the next token */
  int k;                /* Loop counter */

  nSql = strlen(zSql);
  nZ = nSql;
  z = sqlite3_malloc64( nZ+2 );
  if( z==0 ) return 0;
  for(i=j=0; zSql[i]; i += n){
    n = sqlite3GetToken((unsigned char*)zSql+i, &tokenType);
    switch( tokenType ){
      case TK_SPACE: {
        break;
      }
      case TK_ERROR: {
        sqlite3_free(z);
        return 0;
      }
      case TK_LITERAL: {
        z[j++] = '?';
        break;
      }
      case TK_PUNCT:
      case TK_NAME: {
        if( n==4 && sqlite3_strnicmp(zSql+i,"NULL",4)==0 ){
          if( (j>=3 && strncmp(z+j-2,"is",2)==0 && !IdChar(z[j-3]))
           || (j>=4 && strncmp(z+j-3,"not",3)==0 && !IdChar(z[j-4]))
          ){
            /* NULL is a keyword in this case, not a literal value */
          }else{
            /* Here the NULL is a literal value */
            z[j++] = '?';
            break;
          }
        }
        if( j>0 && IdChar(z[j-1]) && IdChar(zSql[i]) ) z[j++] = ' ';
        for(k=0; k<n; k++){
          z[j++] = sqlite3Tolower(zSql[i+k]);
        }
        break;
      }
    }
  }
  while( j>0 && z[j-1]==' ' ){ j--; }
  if( j>0 && z[j-1]!=';' ){ z[j++] = ';'; }
  z[j] = 0;

  /* Make a second pass converting "in(...)" where the "..." is not a
  ** SELECT statement into "in(?,?,?)" */
  for(i=0; i<j; i=n){
    char *zIn = strstr(z+i, "in(");
    int nParen;
    if( zIn==0 ) break;
    n = (int)(zIn-z)+3;  /* Index of first char past "in(" */
    if( n && IdChar(zIn[-1]) ) continue;
    if( strncmp(zIn, "in(select",9)==0 && !IdChar(zIn[9]) ) continue;
    if( strncmp(zIn, "in(with",7)==0 && !IdChar(zIn[7]) ) continue;
    for(nParen=1, k=0; z[n+k]; k++){
      if( z[n+k]=='(' ) nParen++;
      if( z[n+k]==')' ){
        nParen--;
        if( nParen==0 ) break;
      }
    }
    /* k is the number of bytes in the "..." within "in(...)" */
    if( k<5 ){
      z = sqlite3_realloc64(z, j+(5-k)+1);
      if( z==0 ) return 0;
      memmove(z+n+5, z+n+k, j-(n+k));
    }else if( k>5 ){
      memmove(z+n+5, z+n+k, j-(n+k));
    }
    j = j-k+5;
    z[j] = 0;
    memcpy(z+n, "?,?,?", 5);
  }
  return z;
}

/*
** For testing purposes, or to build a stand-alone SQL normalizer program,
** compile this one source file with the -DSQLITE_NORMALIZE_CLI and link
** it against any SQLite library.  The resulting command-line program will
** run sqlite3_normalize() over the text of all files named on the command-
** line and show the result on standard output.
*/
#ifdef SQLITE_NORMALIZE_CLI
#include <stdio.h>
#include <stdlib.h>

/*
** Break zIn up into separate SQL statements and run sqlite3_normalize()
** on each one.  Print the result of each run.
*/
static void normalizeFile(char *zIn){
  int i;
  if( zIn==0 ) return;
  for(i=0; zIn[i]; i++){
    char cSaved;
    if( zIn[i]!=';' ) continue;
    cSaved = zIn[i+1];
    zIn[i+1] = 0;
    if( sqlite3_complete(zIn) ){
      char *zOut = sqlite3_normalize(zIn);
      if( zOut ){
        printf("%s\n", zOut);
        sqlite3_free(zOut);
      }else{
        fprintf(stderr, "ERROR: %s\n", zIn);
      }
      zIn[i+1] = cSaved;
      zIn += i+1;
      i = -1;
    }else{
      zIn[i+1] = cSaved;
    }
  }
}

/*
** The main routine for "sql_normalize".  Read files named on the
** command-line and run the text of each through sqlite3_normalize().
*/
int main(int argc, char **argv){
  int i;
  FILE *in;
  char *zBuf = 0;
  sqlite3_int64 sz, got;

  for(i=1; i<argc; i++){
    in = fopen(argv[i], "rb");
    if( in==0 ){
      fprintf(stderr, "cannot open \"%s\"\n", argv[i]);
      continue;
    }
    fseek(in, 0, SEEK_END);
    sz = ftell(in);
    rewind(in);
    zBuf = sqlite3_realloc64(zBuf, sz+1);
    if( zBuf==0 ){
      fprintf(stderr, "failed to malloc for %lld bytes\n", sz);
      exit(1);
    }
    got = fread(zBuf, 1, sz, in);
    fclose(in);
    if( got!=sz ){
      fprintf(stderr, "only able to read %lld of %lld bytes from \"%s\"\n",
              got, sz, argv[i]);
    }else{
      zBuf[got] = 0;
      normalizeFile(zBuf);
    }
  }
  sqlite3_free(zBuf);
}
#endif /* SQLITE_NORMALIZE_CLI */
