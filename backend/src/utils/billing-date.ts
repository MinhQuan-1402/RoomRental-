// Date-only billing values use Vietnam's business date, independent of server timezone.
export function billingToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`);
}
