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
    FACEBOOK_OAUTH2_CLIENT_ID: string;
    FACEBOOK_OAUTH2_CLIENT_SECRET: string;
    TWITTER_OAUTH2_CONSUMER_KEY: string;
    TWITTER_OAUTH2_CONSUMER_SECRET: string;
    LINE_OAUTH2_CHANNEL_ID: string;
    LINE_OAUTH2_CHANNEL_SECRET: string;
  }
}
