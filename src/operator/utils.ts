/**
 * Utility function to extract a clean error message from an error object
 * This prevents logging full error objects which can pollute logs with stack traces
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  // For any other type, stringify it but avoid logging the full object structure
  return String(error)
}