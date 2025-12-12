/**
 * Checks if an error object is a Gemini API quota error.
 * @param err The error object to check.
 */
export function isQuotaError(err: any): boolean {
  if (err && typeof err.message === 'string') {
    // GoogleGenerativeAI.GoogleGenerativeAIError often includes the status code in the message
    return err.message.includes('429') && err.message.toLowerCase().includes('quota');
  }
  return false;
}
