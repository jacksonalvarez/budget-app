# Check current IAM user policies
Write-Host "=== Checking current IAM policies for budget-app-s3-user ===" -ForegroundColor Yellow

# Try to list current policies (if AWS CLI works in another terminal)
Write-Host "If you have AWS CLI in another terminal, run these commands:" -ForegroundColor Green
Write-Host "aws iam list-attached-user-policies --user-name budget-app-s3-user" -ForegroundColor White
Write-Host "aws iam list-user-policies --user-name budget-app-s3-user" -ForegroundColor White

Write-Host "`n=== AWS Console Manual Fix ===" -ForegroundColor Yellow
Write-Host "1. Go to: https://console.aws.amazon.com/iam/home#/users/budget-app-s3-user" -ForegroundColor Green
Write-Host "2. Click the 'Permissions' tab" -ForegroundColor Green
Write-Host "3. Look for 'BudgetAppS3Policy' - if it's NOT there:" -ForegroundColor Green
Write-Host "   - Click 'Add permissions' > 'Attach existing policies directly'" -ForegroundColor White
Write-Host "   - Search for 'BudgetAppS3Policy'" -ForegroundColor White
Write-Host "   - Check the box and click 'Add permissions'" -ForegroundColor White

Write-Host "`n=== Alternative: Create Inline Policy ===" -ForegroundColor Yellow
Write-Host "If the policy isn't showing up, create an inline policy instead:" -ForegroundColor Green
Write-Host "1. In the user's Permissions tab, click 'Add inline policy'" -ForegroundColor White
Write-Host "2. Click 'JSON' tab" -ForegroundColor White
Write-Host "3. Paste this policy:" -ForegroundColor White

$policy = @'
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
            "Resource": "arn:aws:s3:::983194205325cun/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::983194205325cun"
        }
    ]
}
'@

Write-Host $policy -ForegroundColor Cyan
Write-Host "`n4. Name it 'BudgetAppS3InlinePolicy' and create it" -ForegroundColor White

Write-Host "`n=== Verify Success ===" -ForegroundColor Yellow
Write-Host "After adding the policy, you should see either:" -ForegroundColor Green
Write-Host "- BudgetAppS3Policy (managed policy) OR" -ForegroundColor White
Write-Host "- BudgetAppS3InlinePolicy (inline policy)" -ForegroundColor White
Write-Host "in the user's permissions list." -ForegroundColor White