# Admin Dashboard - Web-Based Independent Panel

## Overview
The admin dashboard is a standalone web application separate from the main mobile app. It provides comprehensive platform management capabilities including user tracking, scholar verification, activity/restaurant management, campaign creation, and analytics.

## Features

### 1. Platform Statistics
- Real-time user metrics (total, new today, this week, this month)
- Scholar statistics and verification status
- Consultation activity tracking
- Donation totals
- Livestream metrics

### 2. User Management
- View all registered users
- Track onboarding progress
- Monitor user activity
- Delete users if needed
- See device types and registration sources

### 3. Scholar Management
- View all scholars and imams
- Verify scholar certificates
- Monitor ratings and reviews
- Track consultation counts
- Manage scholar accounts

### 4. **Activities Management** (NEW!)
- **Upload activities**: Halal restaurants, classes, events, services
- **Full CRUD operations**: Create, Read, Update, Delete
- **Categorization**: Education, Sports, Restaurants, Social, etc.
- **Customize details**:
  - Title, description, location
  - Pricing and capacity
  - Date/time scheduling
  - Contact information
  - Featured status
  - Active/inactive toggle
- **Track engagement**: Views, bookings, ratings

### 5. Marketing Campaigns
- Create push notification campaigns
- Target specific user segments:
  - All users
  - New users (last 7 days)
  - Active users (last 30 days)
  - Inactive users (30+ days)
  - Scholars and imams
- Track campaign performance
- View delivery and engagement metrics

### 6. Analytics (Coming Soon)
- Advanced charts and graphs
- User behavior insights
- Revenue analytics
- Engagement metrics

## Deployment

### Quick Deploy to cPanel
```powershell
cd admin
.\deploy-cpanel.ps1 -FtpHost "ftp.yoursite.com" -FtpUser "username" -FtpPassword "password"
```

See [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md) for detailed cPanel/shell deployment instructions.

### Local Development
1. Open `admin/index.html` in a web browser
2. Login with admin credentials
3. The dashboard connects directly to your Supabase backend

### Production Deployment

#### Option 1: Netlify/Vercel
```bash
# Deploy the admin folder
cd admin
netlify deploy --dir .
# or
vercel deploy
```

#### Option 2: GitHub Pages
1. Push the `admin` folder to a repository
2. Enable GitHub Pages in repository settings
3. Set source to the `admin` folder

#### Option 3: Own Server
1. Upload the `admin` folder to your web server
2. Ensure HTTPS is enabled
3. Configure domain/subdomain (e.g., admin.yourapp.com)

## Security

### Important Security Notes
1. **Admin Role Required**: Only users with `role='admin'` in the profiles table can access
2. **Login Protected**: Requires authentication via Supabase Auth
3. **HTTPS Only**: Always use HTTPS in production
4. **Row Level Security**: All database operations respect RLS policies

### Creating Admin Users
```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

## Configuration

### Supabase Settings
Update credentials in `admin/admin.js`:
```javascript
const SUPABASE_URL = 'your-supabase-url'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

## Database Requirements

Before using the admin dashboard, run the SQL schema:
```bash
# Apply the admin system SQL
Run CREATE_ADMIN_SYSTEM.sql in Supabase SQL Editor
```

This creates:
- `user_onboarding_tracking` table
- `marketing_campaigns` table  
- `campaign_recipients` table
- `admin_activity_log` table
- `platform_analytics` table
- `user_activities` table
- Helper functions and RLS policies

## Access URL

After deployment, access at:
- Local: `file:///path/to/admin/index.html` or `http://localhost:8000/admin`
- Production: `https://admin.yourapp.com` or `https://yourapp.com/admin`

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure admin role is properly set
4. Check RLS policies are applied
