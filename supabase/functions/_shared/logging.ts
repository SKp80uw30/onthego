export const logError = (context: string, error: any) => {
  console.error(`Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    details: error
  });
};

export const logInfo = (context: string, data: any) => {
  console.log(`[${context}]`, data);
};