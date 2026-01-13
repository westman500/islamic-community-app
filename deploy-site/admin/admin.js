// Masjid Platform - Admin Dashboard JavaScript
// Independent Web-Based Admin Panel

// ============================================================================
// APP STORE & QR CODE CONFIGURATION
// Updated with live store URLs - January 2026
// ============================================================================
const QR_CONFIG = {
    // Base URL for QR code landing page
    baseUrl: 'https://masjidmobile.live',
    // Path to download page (this redirects to app stores)
    downloadPath: '/download.html',
    
    // Direct store URLs (LIVE)
    appStoreUrl: 'https://apps.apple.com/us/app/masjidmobile/id6756876021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.masjidmobile.app',
    
    // Apple promo code for testing/marketing
    applePromoCode: 'AX6ENN3FAPEA'
};

// Generate QR code URL that redirects to app stores
function getQRCodeUrl(sessionCode) {
    return `${QR_CONFIG.baseUrl}${QR_CONFIG.downloadPath}?ref=${sessionCode}`;
}

const SUPABASE_URL = 'https://jtmmeumzjcldqukpqcfi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bW1ldW16amNsZHF1a3BxY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjU3NTUsImV4cCI6MjA3ODkwMTc1NX0.Bp-7JF66UIVuzKtVmilxovkEwe-TSXHMT_eqETHVPLo'

// Paystack payouts are processed via edge function (server-side)
// Do NOT store secret keys in client-side code

let currentUser = null

// Initialize Supabase client (using CDN)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Check authentication on page load
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
            showLoginForm()
            return false
        }
        
        // Verify user is admin
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
        
        // Handle database errors
        if (error) {
            console.error('Profile fetch error:', error)
            await supabase.auth.signOut()
            showLoginForm()
            showError(`Database error: ${error.message}. Please run FIX_ADMIN_ROLE_CONSTRAINT.sql in Supabase.`)
            return false
        }
        
        if (!profile) {
            console.error('Profile not found for user:', session.user.id)
            await supabase.auth.signOut()
            showLoginForm()
            showError('Profile not found. Please contact administrator.')
            return false
        }
        
        if (profile.role !== 'admin') {
            console.error('User is not admin:', profile.role)
            await supabase.auth.signOut()
            showLoginForm()
            showError('Access denied. Admin privileges required.')
            return false
        }
        
        currentUser = profile
        return true
    } catch (error) {
        console.error('Unexpected error in checkAuth:', error)
        await supabase.auth.signOut()
        showLoginForm()
        showError(`Authentication error: ${error.message}`)
        return false
    }
}

// Show login form
function showLoginForm() {
    const container = document.querySelector('.container')
    if (!container) {
        console.error('Container not found')
        return
    }
    
    container.innerHTML = `
        <div class="header">
            <h1>🕌 Masjid Platform Admin</h1>
            <p>Admin Login Required</p>
        </div>
        <div class="content">
            <div style="max-width: 400px; margin: 50px auto; padding: 20px;">
                <div id="errorMessage" style="background: #fee; color: #c33; padding: 10px; border-radius: 6px; margin-bottom: 15px; display: none;"></div>
                <form id="loginForm" style="background: #f8f9fa; padding: 30px; border-radius: 12px;">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Email</label>
                        <input type="email" class="form-control" id="loginEmail" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Password</label>
                        <input type="password" class="form-control" id="loginPassword" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">Login</button>
                </form>
            </div>
        </div>
    `
    
    const form = document.getElementById('loginForm')
    if (form) {
        form.addEventListener('submit', handleLogin)
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault()
    
    console.log('Login attempt started')
    
    const emailInput = document.getElementById('loginEmail')
    const passwordInput = document.getElementById('loginPassword')
    
    if (!emailInput || !passwordInput) {
        alert('Form not loaded properly. Please refresh the page.')
        return
    }
    
    const email = emailInput.value
    const password = passwordInput.value
    
    console.log('Attempting login for:', email)
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
            console.error('Auth error:', error)
            alert('Login failed: ' + error.message)
            return
        }
        
        console.log('Login successful, checking admin status...')
        
        // Check if user is admin
        const isAdmin = await checkAuth()
        if (isAdmin) {
            console.log('Admin verified, reloading...')
            location.reload()
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        alert('Login failed: ' + error.message)
    }
}

// Tab switching
window.switchTab = function(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'))
    event.target.classList.add('active')
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
    document.getElementById(tabName).classList.add('active')
    
    // Load data for the tab
    loadTabData(tabName)
}

// Load data for specific tab
async function loadTabData(tabName) {
    switch(tabName) {
        case 'overview':
            await loadOverviewStats()
            break
        case 'users':
            await loadUsers()
            break
        case 'scholars':
            await loadScholars()
            break
        case 'activities':
            await loadActivities()
            break
        case 'campaigns':
            await loadCampaigns()
            break
        case 'marketers':
            await loadMarketers()
            break
        case 'qrcodes':
            await loadQRCodes()
            break
        case 'analytics':
            await loadAnalytics()
            break
    }
}

// Load overview statistics
async function loadOverviewStats() {
    try {
        const { data, error } = await supabase.rpc('get_platform_statistics')
        
        if (error) throw error
        
        const stats = data[0]
        
        document.getElementById('statsContainer').innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>👥 Total Users</h3>
                    <div class="value">${stats.total_users.toLocaleString()}</div>
                    <div class="subtitle">Registered members</div>
                </div>
                
                <div class="stat-card">
                    <h3>✨ New Today</h3>
                    <div class="value">${stats.new_users_today}</div>
                    <div class="subtitle">Joined today</div>
                </div>
                
                <div class="stat-card">
                    <h3>📅 This Week</h3>
                    <div class="value">${stats.new_users_this_week}</div>
                    <div class="subtitle">New this week</div>
                </div>
                
                <div class="stat-card">
                    <h3>📆 This Month</h3>
                    <div class="value">${stats.new_users_this_month}</div>
                    <div class="subtitle">New this month</div>
                </div>
                
                <div class="stat-card">
                    <h3>🎓 Scholars</h3>
                    <div class="value">${stats.total_scholars}</div>
                    <div class="subtitle">${stats.verified_scholars} verified</div>
                </div>
                
                <div class="stat-card">
                    <h3>💬 Consultations</h3>
                    <div class="value">${stats.total_consultations}</div>
                    <div class="subtitle">${stats.active_consultations} active</div>
                </div>
                
                <div class="stat-card">
                    <h3>💰 Donations</h3>
                    <div class="value">₦${stats.total_donations.toLocaleString()}</div>
                    <div class="subtitle">Total raised</div>
                </div>
                
                <div class="stat-card">
                    <h3>📺 Streams</h3>
                    <div class="value">${stats.total_streams}</div>
                    <div class="subtitle">${stats.active_streams} active now</div>
                </div>
            </div>
        `
    } catch (error) {
        showError('Failed to load statistics: ' + error.message)
    }
}

// Load users
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500)
        
        if (error) throw error
        
        const tableHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Registered</th>
                            <th>Balance</th>
                            <th>Push Enabled</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(user => `
                            <tr>
                                <td>${user.full_name || 'N/A'}</td>
                                <td>${user.email || 'N/A'}</td>
                                <td><span class="badge badge-${user.role === 'admin' ? 'danger' : user.role === 'scholar' || user.role === 'imam' ? 'success' : 'info'}">${user.role || 'user'}</span></td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>₦${(user.balance || 0).toLocaleString()}</td>
                                <td>
                                    <span class="badge ${user.push_token ? 'badge-success' : 'badge-secondary'}">
                                        ${user.push_token ? '✓ Yes' : '✗ No'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-danger" onclick="deleteUser('${user.id}')" style="padding: 6px 12px; font-size: 0.875rem;">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
        
        document.getElementById('usersContainer').innerHTML = tableHTML
    } catch (error) {
        showError('Failed to load users: ' + error.message)
        console.error('Load users error:', error)
    }
}

// Load scholars
async function loadScholars() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['scholar', 'imam'])
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        const tableHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Verified</th>
                            <th>Rating</th>
                            <th>Consultations</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(scholar => `
                            <tr>
                                <td>${scholar.full_name}</td>
                                <td>${scholar.email}</td>
                                <td><span class="badge badge-success">${scholar.role}</span></td>
                                <td>
                                    <span class="badge ${scholar.certificate_verified ? 'badge-success' : 'badge-warning'}">
                                        ${scholar.certificate_verified ? '✓ Verified' : 'Pending'}
                                    </span>
                                </td>
                                <td>⭐ ${scholar.average_rating?.toFixed(1) || '0.0'} (${scholar.total_ratings || 0})</td>
                                <td>${scholar.completed_consultations_count || 0}</td>
                                <td>${new Date(scholar.created_at).toLocaleDateString()}</td>
                                <td>
                                    ${!scholar.certificate_verified ? `
                                        <button class="btn btn-primary" onclick="verifyScholar('${scholar.id}')" style="padding: 6px 12px; font-size: 0.875rem; margin-right: 5px;">
                                            Verify
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-danger" onclick="deleteUser('${scholar.id}')" style="padding: 6px 12px; font-size: 0.875rem;">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
        
        document.getElementById('scholarsContainer').innerHTML = tableHTML
    } catch (error) {
        showError('Failed to load scholars: ' + error.message)
    }
}

// Load activities
async function loadActivities() {
    try {
        const { data, error } = await supabase
            .from('app_activities')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        const activitiesHTML = data.length > 0 ? `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Views</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(activity => `
                            <tr>
                                <td>
                                    <strong>${activity.title}</strong>
                                    ${activity.is_featured ? '<span class="badge badge-warning" style="margin-left: 5px;">⭐ Featured</span>' : ''}
                                </td>
                                <td><span class="badge badge-success">${activity.category}</span></td>
                                <td>${activity.activity_type}</td>
                                <td>${activity.location || activity.city || 'N/A'}</td>
                                <td>₦${activity.price?.toLocaleString() || '0'}</td>
                                <td>
                                    <span class="badge ${activity.is_active ? 'badge-success' : 'badge-danger'}">
                                        ${activity.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>${activity.view_count || 0}</td>
                                <td>
                                    <button class="btn btn-primary" onclick='editActivity(${JSON.stringify(activity).replace(/'/g, "&apos;")})' style="padding: 6px 12px; font-size: 0.875rem; margin-right: 5px;">
                                        Edit
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteActivity('${activity.id}')" style="padding: 6px 12px; font-size: 0.875rem;">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<p style="text-align: center; padding: 50px; color: #6c757d;">No activities created yet</p>'
        
        document.getElementById('activitiesContainer').innerHTML = activitiesHTML
    } catch (error) {
        showError('Failed to load activities: ' + error.message)
    }
}

// Show activity form
window.showActivityForm = function() {
    document.getElementById('activityFormContainer').style.display = 'block'
    document.getElementById('activityForm').reset()
    document.getElementById('activityId').value = ''
}

// Hide activity form
window.hideActivityForm = function() {
    document.getElementById('activityFormContainer').style.display = 'none'
    document.getElementById('activityForm').reset()
}

// Edit activity
window.editActivity = function(activity) {
    window.showActivityForm()
    
    document.getElementById('activityId').value = activity.id
    document.getElementById('activityTitle').value = activity.title || ''
    document.getElementById('activityCategory').value = activity.category || 'other'
    document.getElementById('activityType').value = activity.activity_type || 'event'
    document.getElementById('activityDescription').value = activity.description || ''
    document.getElementById('activityLocation').value = activity.location || ''
    document.getElementById('activityCity').value = activity.city || ''
    document.getElementById('activityAddress').value = activity.address || ''
    document.getElementById('activityPrice').value = activity.price || 0
    document.getElementById('activityCapacity').value = activity.capacity || ''
    document.getElementById('activityPhone').value = activity.contact_phone || ''
    
    if (activity.start_date) {
        const startDate = new Date(activity.start_date)
        document.getElementById('activityStartDate').value = startDate.toISOString().slice(0, 16)
    }
    
    if (activity.end_date) {
        const endDate = new Date(activity.end_date)
        document.getElementById('activityEndDate').value = endDate.toISOString().slice(0, 16)
    }
    
    document.getElementById('activityImageUrl').value = activity.image_url || ''
    document.getElementById('activityWebsite').value = activity.website_url || ''
    document.getElementById('activityFeatured').checked = activity.is_featured || false
    document.getElementById('activityActive').checked = activity.is_active !== false
    
    // Scroll to form
    document.getElementById('activityFormContainer').scrollIntoView({ behavior: 'smooth' })
}

// Create/Update activity
document.getElementById('activityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    try {
        const activityId = document.getElementById('activityId').value
        const activityData = {
            title: document.getElementById('activityTitle').value,
            category: document.getElementById('activityCategory').value,
            activity_type: document.getElementById('activityType').value,
            description: document.getElementById('activityDescription').value,
            location: document.getElementById('activityLocation').value,
            city: document.getElementById('activityCity').value,
            address: document.getElementById('activityAddress').value,
            price: parseFloat(document.getElementById('activityPrice').value) || 0,
            capacity: parseInt(document.getElementById('activityCapacity').value) || null,
            contact_phone: document.getElementById('activityPhone').value,
            start_date: document.getElementById('activityStartDate').value || null,
            end_date: document.getElementById('activityEndDate').value || null,
            image_url: document.getElementById('activityImageUrl').value,
            website_url: document.getElementById('activityWebsite').value,
            is_featured: document.getElementById('activityFeatured').checked,
            is_active: document.getElementById('activityActive').checked,
            created_by: currentUser.id,
            updated_at: new Date().toISOString()
        }
        
        let error
        if (activityId) {
            // Update existing
            ({ error } = await supabase
                .from('app_activities')
                .update(activityData)
                .eq('id', activityId))
        } else {
            // Create new
            ({ error } = await supabase
                .from('app_activities')
                .insert([activityData]))
        }
        
        if (error) throw error
        
        showSuccess(activityId ? 'Activity updated successfully!' : 'Activity created successfully!')
        hideActivityForm()
        await loadActivities()
    } catch (error) {
        showError('Failed to save activity: ' + error.message)
    }
})

// Delete activity
window.deleteActivity = async function(activityId) {
    if (!confirm('Delete this activity? This will also delete all bookings and reviews.')) return
    
    try {
        const { error } = await supabase
            .from('app_activities')
            .delete()
            .eq('id', activityId)
        
        if (error) throw error
        
        showSuccess('Activity deleted successfully')
        await loadActivities()
    } catch (error) {
        showError('Failed to delete activity: ' + error.message)
    }
}

// Load campaigns
async function loadCampaigns() {
    try {
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        const campaignsHTML = data.length > 0 ? `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Campaign Name</th>
                            <th>Target</th>
                            <th>Status</th>
                            <th>Recipients</th>
                            <th>Sent</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(campaign => `
                            <tr>
                                <td>
                                    <strong>${campaign.name}</strong>
                                    <br>
                                    <small style="color: #6c757d;">${campaign.message_title}</small>
                                </td>
                                <td>${campaign.target_audience}</td>
                                <td>
                                    <span class="badge ${
                                        campaign.status === 'completed' ? 'badge-success' :
                                        campaign.status === 'draft' ? 'badge-warning' : 'badge-danger'
                                    }">
                                        ${campaign.status}
                                    </span>
                                </td>
                                <td>${campaign.total_recipients || 0}</td>
                                <td>${campaign.total_sent || 0}</td>
                                <td>${new Date(campaign.created_at).toLocaleDateString()}</td>
                                <td>
                                    ${campaign.status === 'draft' ? `
                                        <button class="btn btn-primary" onclick="sendCampaign('${campaign.id}')" style="padding: 6px 12px; font-size: 0.875rem; margin-right: 5px;">
                                            Send
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-danger" onclick="deleteCampaign('${campaign.id}')" style="padding: 6px 12px; font-size: 0.875rem;">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<p style="text-align: center; padding: 50px; color: #6c757d;">No campaigns created yet</p>'
        
        document.getElementById('campaignsContainer').innerHTML = campaignsHTML
    } catch (error) {
        showError('Failed to load campaigns: ' + error.message)
    }
}

// Load analytics
async function loadAnalytics() {
    document.getElementById('analyticsContainer').innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <p style="color: #6c757d; font-size: 1.2rem;">📊 Advanced analytics coming soon...</p>
            <p style="color: #adb5bd;">Charts, graphs, and detailed insights</p>
        </div>
    `
}

// Create campaign
document.getElementById('campaignForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    try {
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .insert([{
                name: document.getElementById('campaignName').value,
                target_audience: document.getElementById('targetAudience').value,
                message_title: document.getElementById('messageTitle').value,
                message_body: document.getElementById('messageBody').value,
                action_url: document.getElementById('actionUrl').value,
                campaign_type: 'push_notification',
                status: 'draft',
                created_by: currentUser.id
            }])
        
        if (error) throw error
        
        showSuccess('Campaign created successfully!')
        e.target.reset()
        await loadCampaigns()
    } catch (error) {
        showError('Failed to create campaign: ' + error.message)
    }
})

// Send campaign
window.sendCampaign = async function(campaignId) {
    if (!confirm('Send this campaign to all targeted users?')) return
    
    try {
        // Get campaign details first
        const { data: campaign, error: campaignError } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single()
        
        if (campaignError || !campaign) {
            throw new Error('Campaign not found')
        }
        
        showSuccess('Sending push notifications...')
        
        // Call the edge function to send actual push notifications
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                campaignId: campaignId,
                title: campaign.message_title,
                body: campaign.message_body,
                targetAudience: campaign.target_audience,
                data: {
                    action_url: campaign.action_url,
                    campaign_name: campaign.name
                }
            })
        })
        
        const result = await response.json()
        
        if (result.error) {
            throw new Error(result.error)
        }
        
        showSuccess(`Campaign sent! ${result.sent || 0} delivered, ${result.failed || 0} failed (${result.total || 0} total recipients)`)
        await loadCampaigns()
    } catch (error) {
        showError('Failed to send campaign: ' + error.message)
    }
}

// Delete campaign
window.deleteCampaign = async function(campaignId) {
    if (!confirm('Delete this campaign?')) return
    
    try {
        const { error } = await supabase
            .from('marketing_campaigns')
            .delete()
            .eq('id', campaignId)
        
        if (error) throw error
        
        showSuccess('Campaign deleted successfully')
        await loadCampaigns()
    } catch (error) {
        showError('Failed to delete campaign: ' + error.message)
    }
}

// Verify scholar
window.verifyScholar = async function(scholarId) {
    if (!confirm('Verify this scholar?')) return
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ certificate_verified: true })
            .eq('id', scholarId)
        
        if (error) throw error
        
        showSuccess('Scholar verified successfully')
        await loadScholars()
    } catch (error) {
        showError('Failed to verify scholar: ' + error.message)
    }
}

// Delete user
window.deleteUser = async function(userId) {
    if (!confirm('Delete this user? This action cannot be undone.')) return
    
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId)
        
        if (error) throw error
        
        showSuccess('User deleted successfully')
        await loadUsers()
        await loadScholars()
    } catch (error) {
        showError('Failed to delete user: ' + error.message)
    }
}

// Show success message
function showSuccess(message) {
    const alert = document.getElementById('successAlert')
    if (alert) {
        alert.textContent = message
        alert.classList.add('show')
        setTimeout(() => alert.classList.remove('show'), 5000)
    } else {
        console.log('Success:', message)
    }
}

// Show error message
function showError(message) {
    const alert = document.getElementById('errorAlert')
    if (alert) {
        alert.textContent = message
        alert.classList.add('show')
        setTimeout(() => alert.classList.remove('show'), 5000)
    } else {
        console.error('Error:', message)
    }
}

// ============================================================================
// CLUSTER MARKETERS MANAGEMENT
// ============================================================================

// Load marketers
async function loadMarketers() {
    try {
        const { data, error } = await supabase
            .from('cluster_marketers')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        const marketersHTML = data && data.length > 0 ? `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Region</th>
                            <th>Scans</th>
                            <th>Downloads</th>
                            <th>Registered</th>
                            <th>💰 Earnings (₦)</th>
                            <th>Pending (₦)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(m => `
                            <tr>
                                <td>
                                    <strong>${m.name}</strong>
                                    ${m.bank_name ? `<br><small style="color: #059669;">🏦 ${m.bank_name.toUpperCase()}</small>` : '<br><small style="color: #ef4444;">⚠️ No bank</small>'}
                                </td>
                                <td>
                                    ${m.email ? `<small>${m.email}</small><br>` : ''}
                                    ${m.phone ? `<small>${m.phone}</small>` : ''}
                                </td>
                                <td>${m.region || ''}<br><small>${m.city || ''}</small></td>
                                <td><strong>${m.total_referrals || 0}</strong></td>
                                <td><strong style="color: #3b82f6;">${m.total_referrals || 0}</strong></td>
                                <td><strong style="color: #10b981;">${m.total_onboarded || 0}</strong></td>
                                <td><strong style="color: #f59e0b;">₦${(m.total_earnings || 0).toLocaleString()}</strong></td>
                                <td>
                                    <strong style="color: ${(m.pending_payout || 0) > 0 ? '#ef4444' : '#6b7280'};">
                                        ₦${(m.pending_payout || 0).toLocaleString()}
                                    </strong>
                                    ${(m.pending_payout || 0) > 0 && m.bank_name && m.account_number ? `
                                        <br><button class="btn btn-success" onclick="processPaystackPayout('${m.id}', ${m.pending_payout}, '${m.bank_name}', '${m.account_number}', '${m.account_name || m.name}')"
                                            style="padding: 2px 6px; font-size: 0.65rem; margin-top: 3px;">
                                            💸 Pay via Paystack
                                        </button>
                                    ` : (m.pending_payout || 0) > 0 ? `
                                        <br><button class="btn btn-warning" onclick="editMarketerBank('${m.id}')"
                                            style="padding: 2px 6px; font-size: 0.65rem; margin-top: 3px;">
                                            🏦 Add Bank First
                                        </button>
                                    ` : ''}
                                </td>
                                <td>
                                    <span class="badge ${m.is_active ? 'badge-success' : 'badge-danger'}">
                                        ${m.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-info" onclick="editMarketerBank('${m.id}')"
                                            style="padding: 4px 8px; font-size: 0.75rem; margin-bottom: 3px;">
                                        🏦 Bank
                                    </button>
                                    <button class="btn ${m.is_active ? 'btn-warning' : 'btn-success'}" 
                                            onclick="toggleMarketer('${m.id}', ${!m.is_active})"
                                            style="padding: 4px 8px; font-size: 0.75rem; margin-right: 5px;">
                                        ${m.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteMarketer('${m.id}')"
                                            style="padding: 4px 8px; font-size: 0.75rem;">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; color: white;">
                <h4 style="margin: 0 0 10px 0;">💰 Earnings Summary</h4>
                <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                    <div>
                        <small>Total Earnings</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">₦${data.reduce((sum, m) => sum + (m.total_earnings || 0), 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Pending Payouts</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">₦${data.reduce((sum, m) => sum + (m.pending_payout || 0), 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Total Paid</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">₦${data.reduce((sum, m) => sum + (m.total_paid || 0), 0).toLocaleString()}</div>
                    </div>
                </div>
                <small style="opacity: 0.8; margin-top: 10px; display: block;">Rate: ₦500/download + ₦500/registration = ₦1,000 per user</small>
            </div>
        ` : '<p style="text-align: center; padding: 50px; color: #6c757d;">No marketers added yet</p>'
        
        document.getElementById('marketersContainer').innerHTML = marketersHTML
    } catch (error) {
        console.error('Error loading marketers:', error)
        document.getElementById('marketersContainer').innerHTML = 
            '<p style="color: red; text-align: center;">Failed to load marketers. Make sure to run CREATE_QR_TRACKING_SYSTEM.sql first.</p>'
    }
}

// Create marketer
document.getElementById('marketerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    try {
        const { data, error } = await supabase
            .from('cluster_marketers')
            .insert([{
                name: document.getElementById('marketerName').value,
                email: document.getElementById('marketerEmail').value || null,
                phone: document.getElementById('marketerPhone').value || null,
                region: document.getElementById('marketerRegion').value || null,
                city: document.getElementById('marketerCity').value || null,
                commission_rate: parseFloat(document.getElementById('marketerCommission').value) || 5,
                bank_name: document.getElementById('marketerBankName').value || null,
                account_number: document.getElementById('marketerAccountNumber').value || null,
                account_name: document.getElementById('marketerAccountName').value || null
            }])
        
        if (error) throw error
        
        showSuccess('Marketer added successfully!')
        e.target.reset()
        await loadMarketers()
    } catch (error) {
        showError('Failed to add marketer: ' + error.message)
    }
})

// Toggle marketer status
window.toggleMarketer = async function(id, isActive) {
    try {
        const { error } = await supabase
            .from('cluster_marketers')
            .update({ is_active: isActive })
            .eq('id', id)
        
        if (error) throw error
        
        showSuccess('Marketer status updated!')
        await loadMarketers()
    } catch (error) {
        showError('Failed to update marketer: ' + error.message)
    }
}

// Delete marketer
window.deleteMarketer = async function(id) {
    if (!confirm('Are you sure you want to delete this marketer?')) return
    
    try {
        const { error } = await supabase
            .from('cluster_marketers')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        
        showSuccess('Marketer deleted!')
        await loadMarketers()
    } catch (error) {
        showError('Failed to delete marketer: ' + error.message)
    }
}

// Process marketer payout
window.processMarketerPayout = async function(marketerId, amount) {
    const bankDetails = prompt(`Enter bank details for ₦${amount.toLocaleString()} payout (format: Bank Name - Account Number - Account Name):`)
    
    if (!bankDetails) return
    
    const parts = bankDetails.split('-').map(p => p.trim())
    if (parts.length < 3) {
        showError('Please enter bank details in format: Bank Name - Account Number - Account Name')
        return
    }
    
    const [bankName, accountNumber, accountName] = parts
    
    if (!confirm(`Confirm payout of ₦${amount.toLocaleString()} to:\n\nBank: ${bankName}\nAccount: ${accountNumber}\nName: ${accountName}`)) {
        return
    }
    
    try {
        // Create payout record
        const { error: payoutError } = await supabase
            .from('marketer_payouts')
            .insert([{
                marketer_id: marketerId,
                amount: amount,
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                status: 'paid',
                reference: 'PAY-' + Date.now(),
                processed_at: new Date().toISOString()
            }])
        
        if (payoutError) throw payoutError
        
        // Update marketer - move from pending to paid
        const { error: updateError } = await supabase
            .from('cluster_marketers')
            .update({
                pending_payout: 0,
                total_paid: supabase.rpc ? amount : amount, // Add to total paid
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                updated_at: new Date().toISOString()
            })
            .eq('id', marketerId)
        
        // Manual update for total_paid (since we can't easily add in supabase-js)
        const { data: marketer } = await supabase
            .from('cluster_marketers')
            .select('total_paid')
            .eq('id', marketerId)
            .single()
        
        if (marketer) {
            await supabase
                .from('cluster_marketers')
                .update({
                    pending_payout: 0,
                    total_paid: (marketer.total_paid || 0) + amount
                })
                .eq('id', marketerId)
        }
        
        showSuccess(`Payout of ₦${amount.toLocaleString()} processed successfully!`)
        await loadMarketers()
    } catch (error) {
        showError('Failed to process payout: ' + error.message)
    }
}

// Paystack bank codes mapping
const PAYSTACK_BANK_CODES = {
    'access': '044',
    'gtbank': '058',
    'zenith': '057',
    'firstbank': '011',
    'uba': '033',
    'stanbic': '221',
    'sterling': '232',
    'union': '032',
    'wema': '035',
    'fidelity': '070',
    'polaris': '076',
    'fcmb': '214',
    'ecobank': '050',
    'keystone': '082',
    'kuda': '090267',
    'opay': '999992',
    'palmpay': '999991',
    'moniepoint': '50515'
}

// Edit marketer bank details
window.editMarketerBank = async function(marketerId) {
    // Get current marketer data
    const { data: marketer, error } = await supabase
        .from('cluster_marketers')
        .select('*')
        .eq('id', marketerId)
        .single()
    
    if (error || !marketer) {
        showError('Failed to load marketer details')
        return
    }
    
    const bankOptions = Object.keys(PAYSTACK_BANK_CODES).map(bank => 
        `<option value="${bank}" ${marketer.bank_name === bank ? 'selected' : ''}>${bank.toUpperCase()}</option>`
    ).join('')
    
    const modalHTML = `
        <div id="bankModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 450px; width: 90%;">
                <h3 style="margin: 0 0 20px 0;">🏦 Edit Bank Details for ${marketer.name}</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Bank Name</label>
                    <select id="editBankName" class="form-control" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="">-- Select Bank --</option>
                        ${bankOptions}
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Account Number</label>
                    <input type="text" id="editAccountNumber" class="form-control" value="${marketer.account_number || ''}" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;" 
                           maxlength="10" placeholder="10-digit account number">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Account Name</label>
                    <input type="text" id="editAccountName" class="form-control" value="${marketer.account_name || ''}" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                           placeholder="Name on account">
                    <button type="button" onclick="verifyAccountName()" style="margin-top: 8px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                        🔍 Verify Account
                    </button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="saveBankDetails('${marketerId}')" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ✅ Save Bank Details
                    </button>
                    <button onclick="document.getElementById('bankModal').remove()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
}

// Verify account name with Paystack
window.verifyAccountName = async function() {
    const bankName = document.getElementById('editBankName').value
    const accountNumber = document.getElementById('editAccountNumber').value
    
    if (!bankName || !accountNumber || accountNumber.length !== 10) {
        showError('Please select a bank and enter a valid 10-digit account number')
        return
    }
    
    const bankCode = PAYSTACK_BANK_CODES[bankName]
    if (!bankCode) {
        showError('Bank not supported for verification')
        return
    }
    
    try {
        showSuccess('Verifying account...')
        
        // Call Paystack to verify account
        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        })
        
        const data = await response.json()
        
        if (data.status && data.data) {
            document.getElementById('editAccountName').value = data.data.account_name
            showSuccess(`✅ Account verified: ${data.data.account_name}`)
        } else {
            showError('Could not verify account. Please enter name manually.')
        }
    } catch (error) {
        console.error('Verification error:', error)
        showError('Verification failed. Please enter account name manually.')
    }
}

// Save bank details
window.saveBankDetails = async function(marketerId) {
    const bankName = document.getElementById('editBankName').value
    const accountNumber = document.getElementById('editAccountNumber').value
    const accountName = document.getElementById('editAccountName').value
    
    if (!bankName || !accountNumber || !accountName) {
        showError('Please fill in all bank details')
        return
    }
    
    try {
        const { error } = await supabase
            .from('cluster_marketers')
            .update({
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                updated_at: new Date().toISOString()
            })
            .eq('id', marketerId)
        
        if (error) throw error
        
        document.getElementById('bankModal').remove()
        showSuccess('Bank details saved successfully!')
        await loadMarketers()
    } catch (error) {
        showError('Failed to save bank details: ' + error.message)
    }
}

// Process payout via Paystack Transfer
window.processPaystackPayout = async function(marketerId, amount, bankName, accountNumber, accountName) {
    const bankCode = PAYSTACK_BANK_CODES[bankName]
    
    if (!bankCode) {
        showError(`Bank "${bankName}" not supported for Paystack transfers. Please update bank details.`)
        return
    }
    
    if (!confirm(`Process Paystack payout of ₦${amount.toLocaleString()} to:\n\n🏦 Bank: ${bankName.toUpperCase()}\n💳 Account: ${accountNumber}\n👤 Name: ${accountName}\n\nThis will transfer funds from your Paystack balance.`)) {
        return
    }
    
    try {
        showSuccess('Processing Paystack transfer...')
        
        // Call edge function to process payout securely
        const response = await fetch(`${SUPABASE_URL}/functions/v1/process-payout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                marketerId,
                amount,
                bankName,
                accountNumber,
                accountName
            })
        })
        
        const result = await response.json()
        
        if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to process payout')
        }
        
        showSuccess(`✅ Paystack transfer of ₦${amount.toLocaleString()} initiated!\nReference: ${result.transferCode}`)
        await loadMarketers()
        
    } catch (error) {
        console.error('Paystack payout error:', error)
        showError('Paystack payout failed: ' + error.message)
    }
}

// ============================================================================
// QR CODE SESSIONS MANAGEMENT
// ============================================================================

// Load QR code sessions
async function loadQRCodes() {
    try {
        // Load marketers for dropdown
        const { data: marketers } = await supabase
            .from('cluster_marketers')
            .select('id, name')
            .eq('is_active', true)
            .order('name')
        
        const marketerSelect = document.getElementById('qrMarketer')
        if (marketerSelect && marketers) {
            marketerSelect.innerHTML = '<option value="">-- No Marketer --</option>' +
                marketers.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
        }
        
        // Load activities for dropdown
        const { data: activities } = await supabase
            .from('app_activities')
            .select('id, title')
            .eq('is_active', true)
            .order('title')
        
        const activitySelect = document.getElementById('qrActivity')
        if (activitySelect && activities) {
            activitySelect.innerHTML = '<option value="">-- No Activity --</option>' +
                activities.map(a => `<option value="${a.id}">${a.title}</option>`).join('')
        }
        
        // Load QR sessions
        const { data, error } = await supabase
            .from('qr_code_sessions')
            .select(`
                *,
                marketer:cluster_marketers(name),
                activity:app_activities(title)
            `)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        const qrHTML = data && data.length > 0 ? `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>QR Code</th>
                            <th>Description</th>
                            <th>Marketer</th>
                            <th>Scans</th>
                            <th>Downloads</th>
                            <th>Registered</th>
                            <th>💰 Earnings (₦)</th>
                            <th>Conversion</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(qr => `
                            <tr>
                                <td>
                                    <div style="text-align: center;">
                                        <div id="qr-${qr.id}" style="margin-bottom: 5px;"></div>
                                        <code style="font-size: 0.8rem; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${qr.session_code}</code>
                                    </div>
                                </td>
                                <td><strong>${qr.description || 'N/A'}</strong><br><small>${qr.target_type}</small></td>
                                <td>${qr.marketer?.name || '-'}</td>
                                <td><strong>${qr.scan_count || 0}</strong></td>
                                <td><strong style="color: #3b82f6;">${qr.download_count || 0}</strong><br>
                                    <small style="color: #f59e0b;">₦${((qr.download_count || 0) * 500).toLocaleString()}</small>
                                </td>
                                <td><strong style="color: #10b981;">${qr.onboard_count || 0}</strong><br>
                                    <small style="color: #f59e0b;">₦${((qr.onboard_count || 0) * 500).toLocaleString()}</small>
                                </td>
                                <td>
                                    <strong style="color: #f59e0b; font-size: 1.1rem;">
                                        ₦${(((qr.download_count || 0) * 500) + ((qr.onboard_count || 0) * 500)).toLocaleString()}
                                    </strong>
                                    <br><small style="color: #6b7280;">
                                        Max: ₦${((qr.download_count || 0) * 1000).toLocaleString()}
                                    </small>
                                </td>
                                <td>
                                    <div style="font-size: 0.8rem;">
                                        <div>Scan→DL: ${qr.scan_count > 0 ? ((qr.download_count / qr.scan_count) * 100).toFixed(0) + '%' : '0%'}</div>
                                        <div>DL→Reg: ${qr.download_count > 0 ? ((qr.onboard_count / qr.download_count) * 100).toFixed(0) + '%' : '0%'}</div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge ${qr.is_active ? 'badge-success' : 'badge-danger'}">
                                        ${qr.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; flex-direction: column; gap: 4px;">
                                        <button class="btn btn-primary" onclick="downloadQR('${qr.session_code}')"
                                                style="padding: 4px 8px; font-size: 0.75rem;" title="Download with MasjidMobile branding">
                                            ⬇️ Branded
                                        </button>
                                        <button class="btn btn-secondary" onclick="downloadQRSimple('${qr.session_code}')"
                                                style="padding: 4px 8px; font-size: 0.75rem;" title="Download plain QR code">
                                            ⬇️ Simple
                                        </button>
                                        <button class="btn btn-danger" onclick="deleteQRSession('${qr.id}')"
                                                style="padding: 4px 8px; font-size: 0.75rem;">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; color: white;">
                <h4 style="margin: 0 0 10px 0;">📊 QR Campaign Summary</h4>
                <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                    <div>
                        <small>Total Scans</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">${data.reduce((sum, q) => sum + (q.scan_count || 0), 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Total Downloads</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">${data.reduce((sum, q) => sum + (q.download_count || 0), 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Registrations</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">${data.reduce((sum, q) => sum + (q.onboard_count || 0), 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Total Earnings</small>
                        <div style="font-size: 1.5rem; font-weight: bold;">₦${(data.reduce((sum, q) => sum + ((q.download_count || 0) * 500) + ((q.onboard_count || 0) * 500), 0)).toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <script>
                // Generate QR codes after table renders
                setTimeout(() => {
                    ${data.map(qr => `
                        if (typeof QRCode !== 'undefined' && document.getElementById('qr-${qr.id}')) {
                            new QRCode(document.getElementById('qr-${qr.id}'), {
                                text: getQRCodeUrl('${qr.session_code}'),
                                width: 80,
                                height: 80
                            });
                        }
                    `).join('')}
                }, 100);
            </script>
        ` : '<p style="text-align: center; padding: 50px; color: #6c757d;">No QR sessions created yet</p>'
        
        document.getElementById('qrCodesContainer').innerHTML = qrHTML
        
        // Generate QR codes
        setTimeout(() => generateQRCodesInTable(data), 200)
    } catch (error) {
        console.error('Error loading QR codes:', error)
        document.getElementById('qrCodesContainer').innerHTML = 
            '<p style="color: red; text-align: center;">Failed to load QR codes. Make sure to run CREATE_QR_TRACKING_SYSTEM.sql first.</p>'
    }
}

// Generate QR codes in table
function generateQRCodesInTable(sessions) {
    if (!sessions || !window.QRCode) return
    
    sessions.forEach(qr => {
        const container = document.getElementById(`qr-${qr.id}`)
        if (container && container.children.length === 0) {
            new QRCode(container, {
                text: getQRCodeUrl(qr.session_code),
                width: 80,
                height: 80,
                colorDark: '#000000',
                colorLight: '#ffffff'
            })
        }
    })
}

// Generate session code
function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return 'MJ-' + result
}

// Create QR code session
document.getElementById('qrCodeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const sessionCode = generateSessionCode()
    
    try {
        const { data, error } = await supabase
            .from('qr_code_sessions')
            .insert([{
                session_code: sessionCode,
                description: document.getElementById('qrDescription').value,
                marketer_id: document.getElementById('qrMarketer').value || null,
                activity_id: document.getElementById('qrActivity').value || null,
                target_type: document.getElementById('qrTargetType').value,
                start_date: document.getElementById('qrStartDate').value || null,
                end_date: document.getElementById('qrEndDate').value || null,
                deep_link_url: `masjidapp://ref/${sessionCode}`
            }])
        
        if (error) throw error
        
        showSuccess(`QR Code created! Session code: ${sessionCode}`)
        e.target.reset()
        await loadQRCodes()
    } catch (error) {
        showError('Failed to create QR code: ' + error.message)
    }
})

// Download QR code with branding
window.downloadQR = function(sessionCode, format = 'png') {
    // Create a temporary container for a larger QR code
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)
    
    if (window.QRCode) {
        const qr = new QRCode(tempDiv, {
            text: getQRCodeUrl(sessionCode),
            width: 400,
            height: 400,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        })
        
        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas')
            if (canvas) {
                // Create a new canvas with branding
                const brandedCanvas = document.createElement('canvas')
                const ctx = brandedCanvas.getContext('2d')
                
                const padding = 40
                const textHeight = 80
                brandedCanvas.width = canvas.width + (padding * 2)
                brandedCanvas.height = canvas.height + (padding * 2) + textHeight
                
                // White background
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, brandedCanvas.width, brandedCanvas.height)
                
                // Draw QR code
                ctx.drawImage(canvas, padding, padding)
                
                // Add app branding at top
                ctx.fillStyle = '#10b981'
                ctx.fillRect(0, 0, brandedCanvas.width, 8)
                
                // Add text at bottom
                ctx.fillStyle = '#111827'
                ctx.font = 'bold 24px Arial, sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText('MasjidMobile', brandedCanvas.width / 2, canvas.height + padding + 35)
                
                ctx.fillStyle = '#6b7280'
                ctx.font = '16px Arial, sans-serif'
                ctx.fillText('Scan to download the app', brandedCanvas.width / 2, canvas.height + padding + 60)
                
                ctx.fillStyle = '#9ca3af'
                ctx.font = '12px monospace'
                ctx.fillText(sessionCode, brandedCanvas.width / 2, canvas.height + padding + 78)
                
                // Download
                const link = document.createElement('a')
                link.download = `MasjidMobile-QR-${sessionCode}.png`
                link.href = brandedCanvas.toDataURL('image/png')
                link.click()
            }
            document.body.removeChild(tempDiv)
        }, 500)
    } else {
        alert('QR library not loaded. Please refresh the page.')
        document.body.removeChild(tempDiv)
    }
}

// Download QR code as simple version (no branding)
window.downloadQRSimple = function(sessionCode) {
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)
    
    if (window.QRCode) {
        new QRCode(tempDiv, {
            text: getQRCodeUrl(sessionCode),
            width: 500,
            height: 500,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        })
        
        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas')
            if (canvas) {
                const link = document.createElement('a')
                link.download = `QR-${sessionCode}.png`
                link.href = canvas.toDataURL('image/png')
                link.click()
            }
            document.body.removeChild(tempDiv)
        }, 500)
    }
}

// Download all QR codes as a zip (requires JSZip library)
window.downloadAllQRCodes = async function() {
    const containers = document.querySelectorAll('[id^="qr-"]')
    if (containers.length === 0) {
        alert('No QR codes to download')
        return
    }
    
    // Simple download one by one with delay
    const sessionCodes = []
    containers.forEach(container => {
        const id = container.id.replace('qr-', '')
        const codeEl = container.parentElement.querySelector('code')
        if (codeEl) {
            sessionCodes.push(codeEl.textContent)
        }
    })
    
    if (sessionCodes.length === 0) return
    
    alert(`Downloading ${sessionCodes.length} QR codes...`)
    
    for (let i = 0; i < sessionCodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600))
        downloadQR(sessionCodes[i])
    }
}

// Delete QR session
window.deleteQRSession = async function(id) {
    if (!confirm('Are you sure you want to delete this QR session?')) return
    
    try {
        const { error } = await supabase
            .from('qr_code_sessions')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        
        showSuccess('QR session deleted!')
        await loadQRCodes()
    } catch (error) {
        showError('Failed to delete QR session: ' + error.message)
    }
}

// Initialize app
async function init() {
    const isAuthenticated = await checkAuth()
    
    if (isAuthenticated) {
        await loadOverviewStats()
    }
}

// Run initialization
init()
