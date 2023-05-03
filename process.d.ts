declare namespace NodeJS {
  export interface ProcessEnv {
    // Required. Do not share your OpenAI API key with anyone! It should remain a secret.
    OPENAI_API_KEY: string;
    // Optional. OpenAI API endpoint. Defaults to https://api.openai.com.
    OPENAI_API_ENDPOINT: string;
    // Optional. Database connection string to store the data.
    DATABASE_URL: string;
    // Optional. API key to protect the backend API endpoint.
    // This needs to be exposed to the frontend and must be prefixed with NEXT_PUBLIC_.
    NEXT_PUBLIC_API_KEY: string;
    // Optional. NextAuth.js URL. Defaults to the current domain.
    NEXTAUTH_URL: string;
    // Optional. NextAuth.js secret. Defaults to a randomly generated string.
    NEXTAUTH_SECRET: string;
    // Optional. NextAuth.js GitHub OAuth client ID.
    GITHUB_ID: string;
    // Optional. NextAuth.js GitHub OAuth client secret.
    GITHUB_SECRET: string;
    // Optional. NextAuth.js Google OAuth client ID.
    GOOGLE_CLIENT_ID: string;
    // Optional. NextAuth.js Google OAuth client secret.
    GOOGLE_CLIENT_SECRET: string;
    // Optional. NextAuth.js email server.
    // This can't be tested locally. Must be deployed to the web to send mail.
    EMAIL_SERVER: string;
    // Optional. Stripe publishable key.
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    // Optional. Stripe API key.
    STRIPE_API_KEY: string;
    // Optional. Stripe webhook secret.
    STRIPE_WEBHOOK_SECRET: string;
  }
}
