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

## Optional integrations

Both of these stay off until the environment variables are set. The rest of the app works without them.

### Document import

Photos and scanned PDFs are read with Mistral OCR (or Gemini, if you point `OCR_PROVIDER` at it). A PDF that already contains text skips image OCR and only sends that text to be structured.

```env
OCR_PROVIDER=mistral
MISTRAL_API_KEY=<your-mistral-key>
# OCR_MODEL=mistral-ocr-latest
# OCR_STRUCTURE_MODEL=mistral-small-latest

# Alternative:
# OCR_PROVIDER=gemini
# GEMINI_API_KEY=<your-gemini-key>
```

Set `OCR_ENABLED=false` to hide the reader even if a key is present. Uploads are limited to 4 MB. Review the rows before they are saved.

### Plaid

Plaid is a separate integration. A new US or Canada team can use Plaid's free Trial plan (up to 10 real items) from the Plaid dashboard. Use `sandbox` until that trial is approved.

```env
PLAID_CLIENT_ID=<your-plaid-client-id>
PLAID_SECRET=<your-plaid-secret>
PLAID_ENV=sandbox
# PLAID_PRODUCTS=transactions
# PLAID_COUNTRY_CODES=US
# PLAID_REDIRECT_URI=https://budgeting.jackson-alvarez.dev/plaid-oauth
# PLAID_WEBHOOK_URL=https://budgeting.jackson-alvarez.dev/api/integrations/plaid/webhook
```

Bank access tokens are encrypted with `NEXTAUTH_SECRET` (or `INTEGRATION_SECRET` if you set one) and stored apart from the budget file the browser can edit. Set `PLAID_ENABLED=false` to turn the integration off without deleting the keys. Disconnecting a bank leaves transactions that were already imported.

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
