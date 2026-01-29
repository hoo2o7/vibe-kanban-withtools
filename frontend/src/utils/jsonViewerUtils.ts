export type SpecialJsonType =
  | 'conceptual_model'
  | 'user_stories_data'
  | 'tasks'
  | 'notification_scenarios'
  | null;

/**
 * Detects if a JSON file matches a special type based on filename.
 * Matches if the filename contains the pattern (case-insensitive).
 *
 * Examples:
 * - "conceptual_model.json" → 'conceptual_model'
 * - "conceptual_model_ver3.json" → 'conceptual_model'
 * - "conceptual_model_3.json" → 'conceptual_model'
 * - "user_stories_data.json" → 'user_stories_data'
 * - "tasks.json" → 'tasks'
 * - "notification_scenarios.json" → 'notification_scenarios'
 * - "other.json" → null
 */
export function detectSpecialJsonType(filename: string): SpecialJsonType {
  const lower = filename.toLowerCase();
  if (lower.includes('conceptual_model')) return 'conceptual_model';
  if (lower.includes('user_stories_data')) return 'user_stories_data';
  if (lower.includes('notification_scenarios') || lower.includes('notification_scenario')) return 'notification_scenarios';
  if (lower.includes('tasks')) return 'tasks';
  return null;
}
