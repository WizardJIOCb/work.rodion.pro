export type AppRuntimeConfig = {
  appName: string;
  appUrl: string;
  apiUrl: string;
};

export const defaultRuntimeConfig: AppRuntimeConfig = {
  appName: "work.rodion.pro",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  apiUrl: process.env.API_URL ?? "http://localhost:3010/api",
};

