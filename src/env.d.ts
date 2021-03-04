declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_URL: string;
    REDIS_URL: string;
    PORT: string;
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
    GMAIL_USER: string;
    GMAIL_PASS: string;
    DOMAIN: string;
    CLOUDINARY_URL: string;
    CLOUDINARY_FOLDER: string;
    GOOGLE_OAUTH2_CLIENT_ID: string;
    GOOGLE_OAUTH2_CLIENT_SECRET: string;
  }
}
