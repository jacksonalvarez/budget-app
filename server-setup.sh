#!/bin/bash
# Initial server setup script for Ubuntu 22.04

# Update system
apt update && apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install certbot for SSL
apt install certbot python3-certbot-nginx -y

# Create app directory
mkdir -p /var/www/budget-app
chown -R $USER:$USER /var/www/budget-app

# Start and enable services
systemctl start nginx
systemctl enable nginx
systemctl start ufw
systemctl enable ufw

# Configure firewall
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw --force enable

echo "✅ Server setup complete!"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"