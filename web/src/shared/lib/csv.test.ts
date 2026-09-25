import { describe, expect, it } from 'vitest'
import { inert, toCSV, type CsvRow } from './csv'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') cell += c
      else if (text[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = false
    } else if (c === '"' && cell === '') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
      i++
    } else cell += c
  }
  row.push(cell)
  rows.push(row)
  return rows
}

describe('the reader used by these tests', () => {
  it('reads a quoted field, a doubled quote and a CRLF row break', () => {
    expect(parseCSV('a,b\r\n"c,d",e')).toEqual([
      ['a', 'b'],
      ['c,d', 'e'],
    ])
    expect(parseCSV('"say ""hi""",2')).toEqual([['say "hi"', '2']])
  })
})

describe('quoting', () => {
  it('quotes a value containing a comma', () => {
    expect(toCSV([['Smith, John', 'Search']])).toBe('"Smith, John",Search')
  })

  it('doubles an embedded quote and wraps the value', () => {
    expect(toCSV([['reference reads "as recorded"', 4]])).toBe(
      '"reference reads ""as recorded""",4',
    )
  })

  it('keeps a value containing a newline inside one cell', () => {
    expect(toCSV([['first line\nsecond line'], ['next row']])).toBe(
      '"first line\nsecond line"\r\nnext row',
    )
  })

  it('hands back the same cells it was given, delimiters and all', () => {
    const rows: CsvRow[] = [
      ['Order', 'Reason'],
      ['ORD-1', 'index down, county called back'],
      ['ORD-2', 'client asked for the "clean" copy'],
      ['ORD-3', 'two problems:\nno plat, and no deed'],
    ]
    expect(parseCSV(toCSV(rows))).toEqual([
      ['Order', 'Reason'],
      ['ORD-1', 'index down, county called back'],
      ['ORD-2', 'client asked for the "clean" copy'],
      ['ORD-3', 'two problems:\nno plat, and no deed'],
    ])
  })

  it('is what stops those cells splitting their own row', () => {
    const rows: CsvRow[] = [
      ['ORD-1', 'index down, county called back'],
      ['ORD-3', 'two problems:\nno plat, and no deed'],
    ]
    const naive = rows.map((r) => r.join(',')).join('\r\n')

    expect(parseCSV(naive)[0]).toHaveLength(3)
    expect(parseCSV(naive)[0]).not.toEqual(rows[0])
    expect(parseCSV(toCSV(rows))[0]).toHaveLength(2)
  })

  it('leaves an ordinary value alone', () => {
    expect(toCSV([['ORD-1', 'Search', 12]])).toBe('ORD-1,Search,12')
  })
})

describe('a cell a spreadsheet would run as a formula', () => {
  it('is written as text, whatever it starts with', () => {
    expect(inert('=HYPERLINK("http://x","click")')).toBe('\'=HYPERLINK("http://x","click")')
    expect(inert('+91 98765 43210')).toBe("'+91 98765 43210")
    expect(inert('-2+3')).toBe("'-2+3")
    expect(inert('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)")
    expect(inert('\t=1+1')).toBe("'\t=1+1")
    expect(inert('\r=1+1')).toBe("'\r=1+1")
  })

  it('leaves a negative number a number, typed or written out', () => {
    expect(toCSV([[-5, '-5', '-1,234.50', 0.5]])).toBe('-5,-5,"-1,234.50",0.5')
  })

  it('leaves a true minus alone, since no spreadsheet reads it as an operator', () => {
    expect(inert('\u2212$40.00')).toBe('\u2212$40.00')
  })

  it('leaves text that only contains an operator alone', () => {
    expect(toCSV([['Smith-Jones', 'a=b', 'x@y.com']])).toBe('Smith-Jones,a=b,x@y.com')
  })

  it('quotes a lone carriage return so it cannot split the row', () => {
    expect(toCSV([['a\rb', 'c']])).toBe('"a\rb",c')
  })
})

describe('empty cells', () => {
  it('writes null and undefined as an empty cell, not as the word', () => {
    expect(toCSV([['', null, undefined, 'x']])).toBe(',,,x')
  })

  it('writes a zero as a zero', () => {
    expect(toCSV([['PT', 0]])).toBe('PT,0')
  })

  it('keeps the column count of a row that is empty end to end', () => {
    expect(toCSV([[null, null, null]])).toBe(',,')
    expect(parseCSV(toCSV([[null, null, null]]))[0]).toHaveLength(3)
  })
})

describe('the file itself', () => {
  it('separates rows with CRLF and ends without one', () => {
    expect(toCSV([['a'], ['b'], ['c']])).toBe('a\r\nb\r\nc')
  })
})
