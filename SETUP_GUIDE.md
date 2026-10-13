# Budget Tracker Setup Guide

Your budgeting app has been successfully configured with Google OAuth and AWS S3
storage!

## What's Been Added

✅ Google OAuth 2.0 authentication with NextAuth.js ✅ AWS S3 cloud storage for
user data ✅ Simplified theme system (Light/Dark mode only) ✅ Secure user
sessions ✅ Protected routes requiring authentication

## Setup Instructions

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. For **Application type**, select "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
8. Copy your **Client ID** and **Client Secret**

### 2. AWS S3 Configuration

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Navigate to **S3** service
3. Create a new bucket (e.g., `your-budgeting-app-bucket`)
4. Set appropriate permissions (private bucket, IAM access only)
5. Go to **IAM** → **Users** → Create a new user
6. Attach policy: `AmazonS3FullAccess` (or create a custom policy)
7. Create **Access Keys** for this user
8. Copy the **Access Key ID** and **Secret Access Key**

### 3. Environment Variables

Update the `.env.local` file in your project root with your credentials:

```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-a-random-32-character-string>

# Google OAuth Configuration
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_REGION=us-east-1
S3_BUCKET_NAME=<your-bucket-name>
```

**Generate NEXTAUTH_SECRET:**

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and you'll be redirected to the sign-in page.

## How It Works

### Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. After approval, redirected back to your app
4. Session is created and stored securely
5. User data is loaded from S3

### Data Storage

- Each user's data is stored in S3 at: `users/{userId}/budget-data.json`
- Data includes: transactions, income sources, recurring expenses, and savings
  goals
- Automatic save on every data change
- Secure, scalable cloud storage

### Theme System

- **Light Mode**: Clean, bright interface
- **Dark Mode**: Easy on the eyes for low-light environments
- Theme preference saved in localStorage
- Toggle with one click in the header

## Features

✨ **Secure Authentication**: Google OAuth 2.0 🗄️ **Cloud Storage**: AWS S3 for
persistent data 🎨 **Simple Themes**: Light and Dark modes 🔒 **Private Data**:
Each user's data is isolated 📱 **Responsive**: Works on desktop and mobile

## Get the new keys

You need two accounts. They are not the same company, and neither one is AWS.

| What you want | Company | What you paste in |
| --- | --- | --- |
| Read a photo or scan of a statement | [Mistral](https://console.mistral.ai/) | `MISTRAL_API_KEY` |
| Pull transactions from a bank | [Plaid](https://dashboard.plaid.com/) | `PLAID_CLIENT_ID` and `PLAID_SECRET` |

Mistral is an AI company. Their OCR product is the replacement for AWS Textract tables. It reads the page. It does not connect to your bank.

Plaid is the bank connection. It does not read photos.

The Import tab on the live site does not exist until the branch with this feature is deployed. Putting keys in Vercel before that deploy does nothing visible. After it is deployed, add the keys in the Vercel project for this app (Settings, Environment Variables, Production), then redeploy. A local `.env.local` only affects `npm run dev` on your machine.

Do not commit either file. `.env.local` is already gitignored.

### 1. Mistral key (document reader)

1. Open [console.mistral.ai](https://console.mistral.ai/) and create an account.
2. In the left sidebar, open **API Keys**. The same page is linked from the docs as [Studio API keys](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key).
3. Click **Create new key**. Name it `budget-app`. Copy the key when it is shown. Mistral will not show it again.
4. Put this in Vercel, or in `.env.local` for local dev:

```env
OCR_PROVIDER=mistral
MISTRAL_API_KEY=paste-the-key-here
```

Leave `OCR_MODEL` unset. The app uses `mistral-ocr-latest` for scans and `mistral-small-latest` to turn extracted text into transaction rows.

Mistral's API can be used without a card at first, with low limits. OCR itself is billed per page (about $4 per 1,000 pages for the OCR call, about $5 per 1,000 when it also returns structured fields). A few statements cost cents. If an upload fails with a billing or quota error, add a payment method in the Mistral console and try again.

You do not want the "Vibe" or "Mistral Code" key types. You want a normal Studio API key.

**Check that the key works** before blaming the app. In a terminal:

```bash
curl https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MISTRAL_API_KEY"
```

A JSON list of models means the key is good. `401` means the key is wrong or incomplete.

**Gemini instead.** Only do this if you already want Google's model. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), create a key, and set:

```env
OCR_PROVIDER=gemini
GEMINI_API_KEY=paste-the-key-here
```

Do not set both providers and hope. `OCR_PROVIDER` picks one. If you leave `OCR_PROVIDER` empty, a Mistral key wins over a Gemini key.

### 2. Plaid keys (bank connection)

1. Sign up at [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup).
2. Open [dashboard.plaid.com/trial-plan](https://dashboard.plaid.com/trial-plan) and start the Trial plan. That plan talks to real banks, so it uses Plaid **Production**, not Sandbox.
3. Open **Team Settings**, then **Keys**. Copy the **client ID** and the **Production** secret. Do not copy the Sandbox secret. The secret has to match the environment, and the app now defaults to production when `PLAID_ENV` is missing.

```env
PLAID_CLIENT_ID=paste-client-id
PLAID_SECRET=paste-the-production-secret
PLAID_ENV=production
PLAID_REDIRECT_URI=https://budgeting.jackson-alvarez.dev/plaid-oauth
PLAID_WEBHOOK_URL=https://budgeting.jackson-alvarez.dev/api/integrations/plaid/webhook
```

`PLAID_ENV=production` is the spelling. `prduction` or `prod` will leave Plaid unconfigured.

In the Plaid dashboard, add `https://budgeting.jackson-alvarez.dev/plaid-oauth` as an **allowed redirect URI**. It has to match `PLAID_REDIRECT_URI` exactly, including `https`.

The trial is free for up to 10 real connections. Deleting a connection does not give the slot back.

Sandbox is only for a fake bank. Set `PLAID_ENV=sandbox` and use the Sandbox secret if you want that. Search **First Platypus Bank** and sign in with `user_good` / `pass_good`. Sandbox cannot see your real accounts.

If Link opens and then your bank bounces back to a Plaid error about the redirect URI, the dashboard allowlist and `PLAID_REDIRECT_URI` do not match.

`NEXTAUTH_SECRET` must already be set (it is, if Google sign-in works). The app uses it to encrypt the bank token. Do not rotate that secret after you connect a bank unless you are ready to disconnect and connect again.

### 3. Where the values go

Production, for the site you already have:

1. Vercel → this project → **Settings** → **Environment Variables**.
2. Add each name and value for the **Production** environment.
3. Deploy again. Vercel does not pick up new variables until the next deployment.

Local:

```env
OCR_PROVIDER=mistral
MISTRAL_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=production
```

Restart `npm run dev` after saving `.env.local`.

Open Import. The pills should say **Mistral OCR** and **Plaid production**. If a pill says **Not configured**, the names above are missing, blank, or on the wrong Vercel environment. If you previously saved `PLAID_ENV=sandbox`, delete it or change it to `production` and redeploy.

`OCR_ENABLED=false` or `PLAID_ENABLED=false` forces that pill off even when the key is present.

## Troubleshooting

### "Unauthorized" Error

- Check that Google OAuth credentials are correct
- Verify redirect URIs match exactly
- Ensure you're using the correct Google Cloud project

### S3 Access Errors

- Verify AWS credentials in `.env.local`
- Check S3 bucket name is correct
- Ensure IAM user has S3 permissions
- Verify bucket region matches `AWS_REGION`

### Session Issues

- Make sure `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again
- Check `NEXTAUTH_URL` matches your domain

## Security Notes

⚠️ **NEVER** commit `.env.local` to version control ⚠️ Keep your AWS credentials
secure ⚠️ Use environment variables for all sensitive data ⚠️ In production, use
HTTPS for `NEXTAUTH_URL`

## Next Steps

- Customize the sign-in page design
- Add email notifications
- Implement data export features
- Add budget analytics and charts
- Set up automated backups

Enjoy your secure, cloud-powered budgeting app! 🎉
