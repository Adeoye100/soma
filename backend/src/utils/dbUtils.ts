const QUESTIONS_COLUMNS = new Set([
  'exam_id', 'user_id', 'question_text', 'question_type',
  'correct_answer', 'options', 'explanation', 'difficulty',
  'order_index', 'points', 'metadata', 'topic', 'subject'
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

const VALID_QUESTION_TYPES = [
  'OBJECTIVE',
  'SHORT_ANSWER',
  'ESSAY',
  'TRUE_FALSE'
] as const;

const VALID_DIFFICULTIES = [
  'easy',
  'medium',
  'hard'
] as const;

export function validateQuestionRow(
  q: Record<string, unknown>,
  index: number,
  examId?: string,
  userId?: string
): Record<string, unknown> {
  // order_index: integer >= 0
  const order_index = Number.isFinite(Number(q.order_index))
    ? Math.max(0, Math.floor(Number(q.order_index)))
    : index;

  // question_type: valid enum or default
  const question_type = VALID_QUESTION_TYPES.includes(q.question_type as typeof VALID_QUESTION_TYPES[number])
    ? q.question_type
    : 'OBJECTIVE';

  // difficulty: valid enum or default
  const difficulty = VALID_DIFFICULTIES.includes(q.difficulty as typeof VALID_DIFFICULTIES[number])
    ? q.difficulty
    : 'medium';

  // points: integer >= 1
  const points = Number.isFinite(Number(q.points))
    ? Math.max(1, Math.floor(Number(q.points)))
    : 10;

  // question_text: string with min 5 chars — throw on failure so it surfaces in logs
  const rawText = typeof q.question_text === 'string' ? q.question_text.trim() : '';
  if (rawText.length < 5) {
    throw new Error(
      `Question ${index + 1}: text too short (got ${rawText.length} chars, minimum is 5)`
    );
  }
  const question_text = rawText;

  // options: must be array
  const options = Array.isArray(q.options) ? q.options : [];

  // correct_answer: non-null string
  const correct_answer = String(q.correct_answer ?? '');

  // explanation: nullable string
  const explanation = q.explanation != null ? String(q.explanation) : null;

  // topic: required string (DB NOT NULL)
  const topic = String(q.topic ?? 'General');

  // subject: optional string
  const subject = String(q.subject ?? '');

  return {
    ...q,
    ...(examId ? { exam_id: examId } : {}),
    ...(userId ? { user_id: userId } : {}),
    order_index,
    question_type,
    difficulty,
    points,
    question_text,
    options,
    correct_answer,
    explanation,
    topic,
    subject
  };
}

export { QUESTIONS_COLUMNS, EXAMS_COLUMNS };
