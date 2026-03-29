const QUESTIONS_COLUMNS = new Set([
  'exam_id', 'user_id', 'question_text', 'question_type',
  'correct_answer', 'options', 'explanation', 'difficulty',
  'order_index', 'points', 'metadata'
]);

const EXAMS_COLUMNS = new Set([
  'user_id', 'title', 'description', 'type', 'difficulty',
  'num_questions', 'time_limit', 'status', 'config',
  'questions', 'metadata', 'subject', 'source_file_name',
  'source_file_type', 'created_at', 'updated_at'
]);

export function sanitizeForTable(
  data: Record<string, unknown>,
  allowedColumns: Set<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowedColumns.has(key))
  );
}

export { QUESTIONS_COLUMNS, EXAMS_COLUMNS };
