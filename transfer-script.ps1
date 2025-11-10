# PowerShell script to transfer budgeting app to main portfolio site
# Run this from PowerShell in your Desktop folder

# Define paths
$budgetingApp = "C:\Users\PWD\Desktop\budgeting-react-app\my-next-app"
$mainSite = "C:\Users\PWD\Desktop\wp\Web-Portfolio"

# Create directory structure in main site
New-Item -ItemType Directory -Path "$mainSite\app\components\budgeting" -Force
New-Item -ItemType Directory -Path "$mainSite\app\components\budgeting\cards" -Force

# Copy all main components
Copy-Item "$budgetingApp\app\components\*.tsx" "$mainSite\app\components\budgeting\" -Force

# Copy cards components
Copy-Item "$budgetingApp\app\components\cards\*.tsx" "$mainSite\app\components\budgeting\cards\" -Force

# Copy theme system
Copy-Item "$budgetingApp\app\theme\*" "$mainSite\app\theme\" -Force

# Copy types (merge with existing)
Copy-Item "$budgetingApp\app\types\*" "$mainSite\app\types\" -Force

# Copy utils (merge with existing)
Copy-Item "$budgetingApp\app\utils\*" "$mainSite\app\utils\" -Force

Write-Host "Files copied successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add dependencies to package.json in main site" -ForegroundColor White
Write-Host "2. Run 'npm install' in main site" -ForegroundColor White
Write-Host "3. Update import paths in copied components" -ForegroundColor White