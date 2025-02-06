export function logInfo(functionName: string, message: string, context?: Record<string, unknown>) {
  console.log(`[${functionName}] ${message}`, context ? context : '');
}

export function logError(functionName: string, message: string, error?: unknown) {
  console.error(`[${functionName}] ${message}`, error ? error : '');
}