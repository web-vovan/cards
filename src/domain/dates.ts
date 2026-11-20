export function localToday(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  return localToday(next)
}
