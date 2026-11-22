// Helpers for scheme deadline_date values (YYYY-MM-DD strings).

export function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function formatDeadlineDate(s) {
  if (!isValidDateString(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isDeadlinePassed(s) {
  if (!isValidDateString(s)) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  return s < today;
}

export function deadlineText(scheme) {
  if (isValidDateString(scheme.deadline_date)) {
    return 'Deadline: ' + formatDeadlineDate(scheme.deadline_date);
  }
  return scheme.deadline;
}
