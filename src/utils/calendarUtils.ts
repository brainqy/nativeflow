/**
 * Generates an RFC 5545 compliant .ics iCalendar file for Google Calendar, Outlook, and Apple Calendar.
 */
export function generateIcsCalendarFile(session: {
  title: string;
  description: string;
  scheduledTimestamp: number;
  durationMinutes?: number;
  location?: string;
}): string {
  const startDate = new Date(session.scheduledTimestamp);
  const duration = session.durationMinutes || 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const formatIcsDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const startFormatted = formatIcsDate(startDate);
  const endFormatted = formatIcsDate(endDate);
  const nowFormatted = formatIcsDate(new Date());
  const uid = `interview-session-${Date.now()}@nativeflow.ai`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NativeFlow AI//Interview Prep Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowFormatted}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${session.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${session.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${session.location || 'NativeFlow AI Voice Room (Browser)'}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: AI Mock Interview Session starting in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
