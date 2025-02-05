export const logInfo = (context: string, data?: any) => {
  console.log(`[INFO] ${context}:`, data ? JSON.stringify(data) : '');
};

export const logError = (context: string, error: any) => {
  console.error(`[ERROR] ${context}:`, error);
  if (error.stack) {
    console.error(error.stack);
  }
};