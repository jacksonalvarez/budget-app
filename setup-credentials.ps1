# AWS & Google Setup Helper Script
# Run this in PowerShell to get your credentials

Write-Host "=== Budget App Setup Helper ===" -ForegroundColor Green

# Check if AWS CLI is installed
if (Get-Command aws -ErrorAction SilentlyContinue) {
    Write-Host "✓ AWS CLI found" -ForegroundColor Green
    
    # Get AWS Account ID
    $accountId = aws sts get-caller-identity --query Account --output text
    Write-Host "AWS Account ID: $accountId" -ForegroundColor Yellow
    
    # Prompt for bucket name
    $bucketName = Read-Host "Enter your S3 bucket name (e.g., my-budget-app-2024)"
    
    Write-Host "Creating S3 bucket..." -ForegroundColor Blue
    aws s3 mb s3://$bucketName --region us-east-1
    
    Write-Host "Creating IAM user..." -ForegroundColor Blue
    aws iam create-user --user-name budget-app-s3-user
    
    Write-Host "Creating access keys..." -ForegroundColor Blue
    $credentials = aws iam create-access-key --user-name budget-app-s3-user --output json | ConvertFrom-Json
    
    # Create policy file
    @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::$bucketName/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::$bucketName"
        }
    ]
}
"@ | Out-File -FilePath "s3-policy.json" -Encoding utf8
    
    Write-Host "Creating and attaching policy..." -ForegroundColor Blue
    $policyArn = (aws iam create-policy --policy-name BudgetAppS3Policy --policy-document file://s3-policy.json --output json | ConvertFrom-Json).Policy.Arn
    aws iam attach-user-policy --user-name budget-app-s3-user --policy-arn $policyArn
    
    Write-Host "`n=== AWS CREDENTIALS ===" -ForegroundColor Green
    Write-Host "AWS_ACCESS_KEY_ID=" -NoNewline -ForegroundColor Yellow
    Write-Host $credentials.AccessKey.AccessKeyId -ForegroundColor White
    Write-Host "AWS_SECRET_ACCESS_KEY=" -NoNewline -ForegroundColor Yellow  
    Write-Host $credentials.AccessKey.SecretAccessKey -ForegroundColor White
    Write-Host "AWS_REGION=us-east-1" -ForegroundColor Yellow
    Write-Host "S3_BUCKET_NAME=" -NoNewline -ForegroundColor Yellow
    Write-Host $bucketName -ForegroundColor White
    
    # Clean up
    Remove-Item "s3-policy.json" -ErrorAction SilentlyContinue
    
} else {
    Write-Host "❌ AWS CLI not found. Install from: https://aws.amazon.com/cli/" -ForegroundColor Red
    Write-Host "Or use AWS Console: https://console.aws.amazon.com/" -ForegroundColor Yellow
}

Write-Host "`n=== GOOGLE OAUTH SETUP ===" -ForegroundColor Green
Write-Host "1. Go to: https://console.cloud.google.com/" -ForegroundColor Yellow
Write-Host "2. Create new project or select existing" -ForegroundColor Yellow
Write-Host "3. Enable Google+ API" -ForegroundColor Yellow
Write-Host "4. Go to: APIs & Services > Credentials > CREATE CREDENTIALS > OAuth client ID" -ForegroundColor Yellow
Write-Host "5. Application type: Web application" -ForegroundColor Yellow
Write-Host "6. Authorized JavaScript origins:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host "   https://localhost:3000" -ForegroundColor White
Write-Host "7. Authorized redirect URIs:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/api/auth/callback/google" -ForegroundColor White
Write-Host "   https://localhost:3000/api/auth/callback/google" -ForegroundColor White
Write-Host "8. Copy the Client ID and Client Secret to your .env.local" -ForegroundColor Yellow

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. Copy the AWS credentials above to your .env.local file" -ForegroundColor Yellow
Write-Host "2. Get Google OAuth credentials and add them to .env.local" -ForegroundColor Yellow
Write-Host "3. Test your setup with: node test-s3.js" -ForegroundColor Yellow