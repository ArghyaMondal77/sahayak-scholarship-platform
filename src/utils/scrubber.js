export const SENSITIVE_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

export function containsSensitive(text) {
  return new RegExp(SENSITIVE_PATTERN.source).test(text);
}

export function scrubSensitive(text) {
  return text.replace(SENSITIVE_PATTERN, '[removed]');
}
