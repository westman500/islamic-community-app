# Admin Dashboard - cPanel/Shell Deployment Guide

## Overview
This guide explains how to deploy the admin dashboard to a cPanel hosting or any web server with shell/FTP access.

## Prerequisites
- cPanel hosting account with file manager or FTP access
- Domain or subdomain configured (e.g., admin.yourapp.com)
- SSL certificate (recommended - Let's Encrypt is free on most cPanel hosts)

## Deployment Methods

### Method 1: cPanel File Manager (Easiest)

1. **Login to cPanel**
   - Go to your hosting provider's cPanel URL
   - Enter your username and password

2. **Navigate to File Manager**
   - Find "File Manager" in the Files section
   - Click to open

3. **Create Admin Directory**
   ```
   - Navigate to public_html (or your domain's root)
   - Create a new folder called "admin"
   - Or for subdomain: Create folder matching subdomain name
   ```

4. **Upload Files**
   - Click "Upload" button
   - Select and upload these files from your local admin folder:
     - index.html
     - admin.js
     - README.md
   
   Alternative: Upload as ZIP
   - Compress your admin folder to admin.zip
   - Upload the ZIP file
   - Right-click the ZIP → Extract

5. **Set Permissions**
   - Select all uploaded files
   - Click "Permissions" or "Change Permissions"
   - Set to 644 for files
   - Set to 755 for directories

6. **Access Your Admin Panel**
   - If in public_html/admin: https://yourwebsite.com/admin
   - If subdomain: https://admin.yourwebsite.com

### Method 2: FTP/SFTP

1. **Get FTP Credentials**
   - In cPanel, go to "FTP Accounts"
   - Note your FTP hostname, username, and password

2. **Connect via FTP Client**
   - Download FileZilla (free): https://filezilla-project.org
   - Or use any FTP client (WinSCP, Cyberduck, etc.)
   - Connect using your credentials:
     ```
     Host: ftp.yourwebsite.com (or your server IP)
     Username: your_ftp_username
     Password: your_ftp_password
     Port: 21 (FTP) or 22 (SFTP)
     ```

3. **Upload Admin Files**
   - Navigate to public_html/admin (or your target directory)
   - Drag and drop all admin folder files:
     - index.html
     - admin.js
     - README.md

4. **Verify Upload**
   - Visit https://yourwebsite.com/admin
   - You should see the login page

### Method 3: SSH/Shell Access (Advanced)

If you have SSH access to your server:

1. **Connect via SSH**
   ```bash
   ssh username@yourserver.com
   ```

2. **Navigate to Web Directory**
   ```bash
   cd /home/username/public_html
   # or
   cd /var/www/html
   ```

3. **Create Admin Directory**
   ```bash
   mkdir admin
   cd admin
   ```

4. **Upload Files**
   
   Option A: Using SCP (from your local machine)
   ```bash
   scp -r /path/to/local/admin/* username@yourserver.com:/home/username/public_html/admin/
   ```
   
   Option B: Using Git (if admin is in a repo)
   ```bash
   git clone https://github.com/yourusername/yourrepo.git temp
   cp temp/admin/* .
   rm -rf temp
   ```
   
   Option C: Create files manually
   ```bash
   nano index.html  # Paste HTML content
   nano admin.js    # Paste JS content
   ```

5. **Set Permissions**
   ```bash
   chmod 755 .
   chmod 644 *.html *.js *.md
   ```

## Setting Up a Subdomain (Recommended)

### In cPanel:

1. **Create Subdomain**
   - In cPanel, find "Subdomains"
   - Enter subdomain name: `admin`
   - Select your domain from dropdown
   - Document root: `/public_html/admin` (or auto-created path)
   - Click "Create"

2. **SSL Certificate**
   - Go to "SSL/TLS Status"
   - Find your subdomain (admin.yoursite.com)
   - Click "Run AutoSSL"
   - Wait for certificate to be issued

3. **Access**
   - Visit https://admin.yoursite.com
   - Should show your admin login page

## Configuration

### Update Supabase Credentials

After uploading, you may need to verify the Supabase credentials in admin.js:

1. **Edit admin.js**
   - In cPanel File Manager, right-click admin.js → Edit
   - Or via FTP, download, edit locally, re-upload
   
2. **Update these lines:**
   ```javascript
   const SUPABASE_URL = 'https://jtmmeumzjcldqukpqcfi.supabase.co'
   const SUPABASE_ANON_KEY = 'your-anon-key-here'
   ```

3. **Save and upload**

## Security Best Practices

### 1. Use HTTPS Only
- Always access via https://
- Force HTTPS redirect in .htaccess:
  ```apache
  # Create/edit .htaccess in admin folder
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  ```

### 2. Restrict Access by IP (Optional)
Add to .htaccess in admin folder:
```apache
# Allow only specific IP addresses
<Files "index.html">
    Order Deny,Allow
    Deny from all
    Allow from 123.456.789.0  # Your office IP
    Allow from 98.765.432.1   # Your home IP
</Files>
```

### 3. Add Basic Auth (Double Protection)
Create .htpasswd file and add to .htaccess:
```apache
AuthType Basic
AuthName "Admin Area"
AuthUserFile /home/username/public_html/admin/.htpasswd
Require valid-user
```

Generate .htpasswd:
- Use cPanel "Directory Privacy" feature
- Or online: https://www.web2generators.com/apache-tools/htpasswd-generator

### 4. Hide Directory Listing
Add to .htaccess:
```apache
Options -Indexes
```

## Troubleshooting

### Problem: "403 Forbidden"
**Solution:**
- Check file permissions (should be 644)
- Check .htaccess for restrictive rules
- Ensure index.html exists

### Problem: "404 Not Found"
**Solution:**
- Verify files are in correct directory
- Check subdomain document root setting
- Clear browser cache

### Problem: Blank white page
**Solution:**
- Check browser console (F12) for errors
- Verify admin.js is loading
- Check Supabase credentials
- Ensure CORS is not blocking (Supabase usually allows all origins)

### Problem: Login not working
**Solution:**
- Verify Supabase URL and key in admin.js
- Check browser console for API errors
- Ensure you've created an admin user in database:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
  ```

### Problem: Mixed content warnings
**Solution:**
- Ensure all resources load via HTTPS
- Update any http:// URLs to https://
- Check Supabase URL uses https://

## Performance Optimization

### 1. Enable Gzip Compression
Add to .htaccess:
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### 2. Browser Caching
Add to .htaccess:
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/javascript "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
</IfModule>
```

### 3. Minify Files (Optional)
- Before uploading, minify HTML/CSS/JS using online tools
- Or use build tools like Terser (for JS)

## Updating the Admin Panel

### Via cPanel File Manager:
1. Navigate to admin folder
2. Right-click the file to update → Edit
3. Make changes
4. Save

### Via FTP:
1. Download file
2. Edit locally
3. Re-upload (overwrites old version)

### Via Git (if using version control):
```bash
cd /home/username/public_html/admin
git pull origin main
```

## Backup

### Manual Backup:
1. In cPanel File Manager
2. Select admin folder
3. Click "Compress"
4. Download the ZIP file

### Automated Backup:
- Use cPanel's backup wizard
- Schedule regular backups (daily/weekly)
- Store backups offsite

## Support & Monitoring

### Setup Monitoring:
- Use UptimeRobot (free): https://uptimerobot.com
- Monitor: https://admin.yoursite.com
- Get alerts if site goes down

### Error Logging:
Check cPanel error logs:
- cPanel → Metrics → Errors
- Or via SSH: `tail -f ~/logs/error_log`

## Next Steps After Deployment

1. ✅ Visit your admin URL
2. ✅ Login with admin credentials
3. ✅ Verify all tabs work (Overview, Users, Scholars, Activities, Campaigns)
4. ✅ Test creating an activity
5. ✅ Test sending a campaign
6. ✅ Bookmark admin URL for easy access

---

**Deployment Complete!** 🎉

Your admin dashboard is now live and accessible to manage your Masjid platform.

For issues: Check browser console (F12) and server error logs.
