# Quick fix for S3 permissions
Write-Host "Fixing S3 permissions for budget-app-s3-user..." -ForegroundColor Yellow

# Create policy
$policyResult = aws iam create-policy --policy-name BudgetAppS3PolicyFixed --policy-document file://s3-policy-fix.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Policy created successfully" -ForegroundColor Green
} elseif ($policyResult -match "EntityAlreadyExists") {
    Write-Host "✓ Policy already exists" -ForegroundColor Green
} else {
    Write-Host "❌ Error creating policy: $policyResult" -ForegroundColor Red
}

# Attach policy
$attachResult = aws iam attach-user-policy --user-name budget-app-s3-user --policy-arn "arn:aws:iam::983194205325:policy/BudgetAppS3PolicyFixed" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Policy attached successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Error attaching policy: $attachResult" -ForegroundColor Red
}

# Verify
Write-Host "`nVerifying permissions..." -ForegroundColor Blue
aws iam list-attached-user-policies --user-name budget-app-s3-user

Write-Host "`n✓ Permissions fixed! Try your app again." -ForegroundColor Green