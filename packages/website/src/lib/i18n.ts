export function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}
