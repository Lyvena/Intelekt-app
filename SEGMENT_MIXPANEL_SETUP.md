# 🔌 Segment + Mixpanel Integration Guide

## Overview

This guide will help you connect Mixpanel to your Intelekt app through Segment, enabling powerful analytics and user tracking.

---

## 📋 Prerequisites

Before you begin, you'll need:
- [ ] Segment account (free at https://segment.com)
- [ ] Mixpanel account (free at https://mixpanel.com)
- [ ] Your Segment Write Key
- [ ] Your Mixpanel Project Token

---

## 🚀 Step 1: Set Up Segment

### 1.1 Create a Segment Source

1. Go to https://app.segment.com
2. Click **"Add Source"**
3. Select **"Website"** → **"Analytics.js"**
4. Name it: `Intelekt Web App`
5. Click **"Add Source"**

### 1.2 Get Your Write Key

1. In your Segment source settings
2. Go to **"Settings"** → **"API Keys"**
3. Copy your **Write Key** (looks like: `abc123xyz456...`)
4. Save it - you'll need it in Step 3

---

## 🎯 Step 2: Connect Mixpanel to Segment

### 2.1 Add Mixpanel Destination

1. In Segment, go to your source
2. Click **"Add Destination"**
3. Search for **"Mixpanel"**
4. Click **"Configure Mixpanel"**

### 2.2 Configure Mixpanel

1. **Enable the destination**
2. Enter your **Mixpanel Project Token**:
   - Get it from: https://mixpanel.com/project/settings
   - Go to **"Project Settings"** → **"Project Token"**
3. Configure settings:
   - ✅ **Track All Pages** - Yes
   - ✅ **Track Categorized Pages** - Yes
   - ✅ **Track Named Pages** - Yes
   - ✅ **People** - Yes (for user profiles)
   - ✅ **Cross Subdomain Cookie** - Yes

4. Click **"Save Changes"**

---

## 🔧 Step 3: Segment Configuration

### 3.1 Segment Write Key Already Configured! ✅

Your Segment CDP is already set up with Write Key:
```
0WTAZaRXGEzVm9holWqVUoVcsPrhoX6R
```

The Segment snippet in `frontend/index.html` is ready to use. No additional configuration needed!

### 3.2 Verify Installation

Once deployed, you can verify Segment is working:

1. Open your app in a browser
2. Open DevTools (F12) → Console
3. Type: `analytics`
4. You should see the Segment analytics object

Or check Network tab for requests to:
```
https://cdn.segment.com/analytics.js/v1/0WTAZaRXGEzVm9holWqVUoVcsPrhoX6R/analytics.min.js
```

---

## 📊 Step 4: Integrate Analytics in Your Code

### 4.1 Update AuthContext (Login/Register)

Add analytics tracking to `frontend/src/contexts/AuthContext.tsx`:

```typescript
import analytics from '../lib/analytics';

// In the login function:
const login = async (username: string, password: string) => {
  try {
    const response = await authAPI.login({ username, password });
    // ... existing code ...
    
    // Track login
    analytics.userLoggedIn(response.user.id, response.user.email);
  } catch (error) {
    // ... error handling ...
  }
};

// In the register function:
const register = async (data: RegisterRequest) => {
  try {
    const response = await authAPI.register(data);
    // ... existing code ...
    
    // Track registration
    analytics.userRegistered(response.user.id, response.user.email, response.user.username);
  } catch (error) {
    // ... error handling ...
  }
};

// In the logout function:
const logout = () => {
  analytics.userLoggedOut();
  // ... existing code ...
};
```

### 4.2 Update App.tsx (Project Events)

Add analytics to `frontend/src/App.tsx`:

```typescript
import analytics from './lib/analytics';

// When creating a project:
const handleCreateProject = async () => {
  try {
    const project = await projectsAPI.create({
      name: newProjectName,
      description: newProjectDesc,
      tech_stack: newProjectTech,
      ai_provider: aiProvider,
    });
    
    // Track project creation
    analytics.projectCreated(
      project.id,
      project.name,
      project.tech_stack,
      project.ai_provider
    );
    
    // ... rest of code ...
  } catch (error) {
    // ... error handling ...
  }
};

// When sending a chat message:
const handleSendMessage = async () => {
  try {
    const startTime = Date.now();
    
    // ... send message code ...
    
    const responseTime = Date.now() - startTime;
    
    // Track chat events
    analytics.chatMessageSent(currentProject.id, inputMessage.length);
    analytics.aiResponseReceived(currentProject.id, aiProvider, responseTime);
    
    // ... rest of code ...
  } catch (error) {
    // ... error handling ...
  }
};

// When deleting a project:
const handleDeleteProject = async (projectId: string) => {
  try {
    await projectsAPI.delete(projectId);
    
    // Track deletion
    const project = projects.find(p => p.id === projectId);
    if (project) {
      analytics.projectDeleted(project.id, project.name);
    }
    
    // ... rest of code ...
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 🧪 Step 5: Test Your Integration

### 5.1 Local Testing

1. Start your dev server:
```bash
cd frontend
npm run dev
```

2. Open browser DevTools (F12)
3. Go to **Console** tab
4. You should see:
```
Page tracked: undefined {}
```

5. Perform actions:
   - Register a new user
   - Login
   - Create a project
   - Send a chat message

6. Check console for tracking logs:
```
User identified: user_123
Event tracked: User Registered {...}
Event tracked: Project Created {...}
```

### 5.2 Verify in Segment

1. Go to https://app.segment.com
2. Click your source → **"Debugger"**
3. You should see events flowing in real-time:
   - `page` - Page views
   - `identify` - User identification
   - `track` - Custom events

### 5.3 Verify in Mixpanel

1. Go to https://mixpanel.com
2. Click **"Events"** in the left sidebar
3. You should see your events:
   - User Registered
   - User Logged In
   - Project Created
   - Chat Message Sent
   - etc.

4. Click **"Users"** to see user profiles

---

## 📈 What You Can Track

### User Events
- ✅ User Registration
- ✅ User Login
- ✅ User Logout
- ✅ User Profile Updates

### Project Events
- ✅ Project Created
- ✅ Project Deleted
- ✅ Project Exported
- ✅ Project Viewed

### Interaction Events
- ✅ Chat Message Sent
- ✅ AI Response Received
- ✅ Code Generated
- ✅ File Viewed

### System Events
- ✅ Page Views
- ✅ Errors
- ✅ Performance Metrics

---

## 🎨 Mixpanel Features You Can Use

### 1. Funnels
Track user journey:
```
Registration → First Project → First Chat → Code Generated
```

### 2. Retention
See how many users come back:
- Day 1, Day 7, Day 30 retention
- Feature adoption over time

### 3. Cohorts
Group users by behavior:
- Active users
- Power users (>10 projects)
- Users who haven't created projects

### 4. A/B Testing
Test different features:
- AI provider preference
- UI variations
- Feature adoption

### 5. User Profiles
See individual user activity:
- All events
- Properties
- Session history

---

## 🔒 Privacy & GDPR Compliance

### Important Considerations:

1. **Add Privacy Policy**
   - Disclose analytics tracking
   - Explain data collection
   - Provide opt-out option

2. **Cookie Consent**
   - Consider adding cookie banner
   - Allow users to opt-out

3. **Data Retention**
   - Configure in Mixpanel settings
   - Set appropriate retention periods

4. **PII Handling**
   - Don't track sensitive data
   - Hash or anonymize when possible

---

## 🐛 Troubleshooting

### Events Not Showing in Segment

1. **Check Write Key**
   - Verify it's correct in index.html
   - No extra spaces or quotes

2. **Check Browser Console**
   - Look for errors
   - Verify `window.analytics` exists

3. **Check Network Tab**
   - Look for requests to `api.segment.io`
   - Should see 200 status codes

### Events Not Showing in Mixpanel

1. **Check Destination Status**
   - In Segment, verify Mixpanel is enabled
   - Check for error messages

2. **Check Mixpanel Token**
   - Verify it's correct in Segment settings
   - Try re-entering it

3. **Wait a Few Minutes**
   - Data can take 1-2 minutes to appear
   - Refresh Mixpanel dashboard

### TypeScript Errors

1. **Analytics Not Found**
   - Make sure `analytics.ts` is in `src/lib/`
   - Check import paths

2. **Type Errors**
   - Verify TypeScript version
   - Check `tsconfig.json` settings

---

## 📚 Additional Resources

### Documentation
- **Segment Docs**: https://segment.com/docs/
- **Mixpanel Docs**: https://docs.mixpanel.com/
- **Analytics.js**: https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/

### Segment Integrations
You can also connect:
- Google Analytics
- Amplitude
- Heap
- Intercom
- Customer.io
- And 300+ more destinations

### Best Practices
- Track meaningful events
- Use consistent naming
- Add relevant properties
- Don't over-track
- Respect user privacy

---

## ✅ Checklist

### Setup
- [ ] Created Segment account
- [ ] Created Segment source
- [ ] Got Segment Write Key
- [ ] Created Mixpanel account
- [ ] Got Mixpanel Project Token
- [ ] Connected Mixpanel to Segment
- [ ] Added Write Key to index.html

### Integration
- [ ] Added analytics.ts utility
- [ ] Updated AuthContext with tracking
- [ ] Updated App.tsx with tracking
- [ ] Tested locally
- [ ] Verified in Segment Debugger
- [ ] Verified in Mixpanel

### Compliance
- [ ] Added privacy policy
- [ ] Disclosed analytics tracking
- [ ] Configured data retention
- [ ] Reviewed PII handling

---

## 🎉 You're All Set!

Once configured, you'll have:
- ✅ Real-time event tracking
- ✅ User behavior analytics
- ✅ Funnel analysis
- ✅ Retention metrics
- ✅ User profiles
- ✅ Custom dashboards

**Start making data-driven decisions for your Intelekt app! 📊**
