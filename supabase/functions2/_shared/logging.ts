type LogLevel = 'info' | 'error' | 'warn';

interface LogContext {
  [key: string]: unknown;
}

export const logMessage = (
  level: LogLevel,
  functionName: string,
  message: string,
  context?: LogContext
) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    function: functionName,
    message,
    ...context
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData, null, 2));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData, null, 2));
      break;
    default:
      console.log(JSON.stringify(logData, null, 2));
  }
};

export const logInfo = (functionName: string, message: string | LogContext, context?: LogContext) => {
  if (typeof message === 'string') {
    logMessage('info', functionName, message, context);
  } else {
    logMessage('info', functionName, 'Info log with context', message);
  }
};

export const logError = (functionName: string, error: Error | string, context?: LogContext) => {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorContext = error instanceof Error 
    ? { 
        ...context,
        stack: error.stack,
        name: error.name
      }
    : context;
  
  logMessage('error', functionName, errorMessage, errorContext);
};

export const logWarn = (functionName: string, message: string, context?: LogContext) => {
  logMessage('warn', functionName, message, context);
};