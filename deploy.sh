#!/bin/bash
# Deployment script - run this on your server

APP_DIR="/var/www/budget-app"
REPO_URL="https://github.com/yourusername/budget-app.git"  # Replace with your repo
DOMAIN="budget.yourdomain.com"  # Replace with your subdomain

echo "🚀 Deploying Budget App..."

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "📥 Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create production environment file
echo "⚙️ Setting up environment..."
cat > .env.local << EOF
# Production Environment Variables
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Google OAuth (copy from your local .env.local)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS S3 Configuration (copy from your local .env.local)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Optional. Leave blank to keep document import and Plaid off.
OCR_PROVIDER=mistral
MISTRAL_API_KEY=
GEMINI_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
EOF

echo "❗ IMPORTANT: Edit .env.local with your actual credentials!"
echo "📝 File location: $APP_DIR/.env.local"

# Build the application
echo "🔨 Building application..."
npm run build

# Setup PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'budget-app',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start or restart the application with PM2
echo "🚀 Starting application..."
pm2 delete budget-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Application deployed successfully!"
echo "🔗 Local access: http://localhost:3000"