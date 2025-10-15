export const logSync = (scope: string, info: Record<string, unknown> = {}) => {
  const payload = { scope, ...info, at: new Date().toISOString() };
  console.log(JSON.stringify(payload));
};
