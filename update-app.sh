#!/bin/bash
# Quick update script for future deployments

cd /var/www/budget-app

echo "🔄 Updating budget app..."
git pull origin main
npm install
npm run build
pm2 restart budget-app

echo "✅ Update complete!"
pm2 status