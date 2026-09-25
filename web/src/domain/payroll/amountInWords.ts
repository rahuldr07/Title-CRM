export function words(n: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const word = (table: string[], i: number) => table[i] ?? ''
  const two = (x: number): string =>
    x < 20 ? word(ones, x) : word(tens, Math.floor(x / 10)) + (x % 10 ? ` ${word(ones, x % 10)}` : '')
  const three = (x: number): string =>
    x > 99 ? `${word(ones, Math.floor(x / 100))} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x)

  const v = Math.round(n)
  if (!v) return 'Zero'
  const abs = Math.abs(v)
  const cr = Math.floor(abs / 10000000)
  const lk = Math.floor((abs % 10000000) / 100000)
  const th = Math.floor((abs % 100000) / 1000)
  const rest = abs % 1000
  return (
    (v < 0 ? 'Minus ' : '') +
    [
      cr ? `${three(cr)} Crore` : '',
      lk ? `${three(lk)} Lakh` : '',
      th ? `${three(th)} Thousand` : '',
      rest ? three(rest) : '',
    ]
      .filter(Boolean)
      .join(' ') + ' Only'
  )
}
