
export interface LogContext {
  [key: string]: unknown;
}

export const logInfo = (functionName: string, message: string | LogContext, context?: LogContext) => {
  console.log(`[INFO] ${functionName}:`, message, context || '');
};

export const logError = (functionName: string, error: Error | string, context?: LogContext) => {
  console.error(`[ERROR] ${functionName}:`, error instanceof Error ? error.message : error, context || '', 
    error instanceof Error ? error.stack : '');
};

export const logWarn = (functionName: string, message: string, context?: LogContext) => {
  console.warn(`[WARN] ${functionName}:`, message, context || '');
};
