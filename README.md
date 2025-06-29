# Goalify - AI Coaching Companion

Your AI coaching companion for meaningful conversations and personal growth. Talk or type your way to clarity with Goalify.

## Features

- 🤖 AI-powered coaching conversations with structured GROW methodology
- 🎯 Smart goal creation and tracking with XP rewards
- 📊 Progress dashboard with levels, streaks, and achievements
- 🔥 Daily streak tracking to maintain momentum
- 🎤 Voice input and output (optional with ElevenLabs)
- 📱 Responsive design optimized for all devices
- 💾 Robust local storage fallback for offline functionality
- ⚡ Real-time goal completion with AI verification

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (Optional - for full AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# ElevenLabs Configuration (Optional - for voice features)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Voice Configuration
VITE_VOICE_ID=your_preferred_voice_id
```

## ⚠️ Important: Supabase Configuration

**If you're experiencing authentication errors (JWSError JWSInvalidSignature), follow these steps:**

1. **Go to your Supabase project dashboard** at [supabase.com](https://supabase.com)
2. **Navigate to Project Settings → API**
3. **Copy the correct values:**
   - **Project URL**: Should look like `https://your-project-id.supabase.co`
   - **anon/public key**: Should be a long JWT token (3 parts separated by dots)
4. **Update your `.env` file** with the exact values from your dashboard
5. **Restart your development server** after updating the environment variables

**Common issues:**
- ❌ Using the wrong project URL or API key
- ❌ Copying the service role key instead of the anon key
- ❌ Extra spaces or characters in the environment variables
- ❌ Not restarting the server after changing environment variables

## Deployment on Netlify

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`
4. Add the environment variables in Netlify's dashboard:
   - Go to Site settings > Environment variables
   - Add each `VITE_*` variable from your `.env` file
   - **Make sure to use the exact same values from your Supabase dashboard**

**Important**: Never commit your `.env` file to version control. The environment variables should be set in Netlify's dashboard for production deployments.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create your `.env` file with the required variables (see Supabase Configuration above)
4. Start the development server: `npm run dev`

## Database Setup

The app uses Supabase for authentication and data storage. The database schema is automatically created using the migration files in the `supabase/migrations/` directory.

## Key Features

### AI Coaching System
- **Structured GROW Methodology**: Goal, Reality, Options, Way forward
- **3-Question Coaching Cycles**: AI asks exactly 3 questions before proposing goals
- **Goal Memory**: AI remembers all user goals across sessions
- **Smart Goal Creation**: Automatic difficulty and XP calculation
- **Idle Detection**: Prompts users after 2 minutes of inactivity

### Goal Management
- **Real-time Goal Tracking**: Goals appear instantly in the sidebar
- **AI Verification**: Goals must be verified with detailed explanations
- **XP Rewards**: Time-based bonuses for early completion
- **Deadline Tracking**: Visual countdown timers for each goal
- **Completion Analytics**: Track success rates and patterns

### Progress System
- **XP and Levels**: Earn experience points for completing goals
- **Daily Streaks**: Maintain momentum with streak tracking
- **Achievements**: Unlock badges for milestones
- **Analytics Dashboard**: Comprehensive progress visualization

### Voice Features (Optional)
- **Speech Recognition**: Voice input for natural conversations
- **Text-to-Speech**: AI responses can be spoken aloud
- **Voice Indicators**: Visual feedback during voice interactions

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI GPT-4 for coaching responses and goal verification
- **Voice**: ElevenLabs for text-to-speech
- **Deployment**: Netlify
- **State Management**: React hooks with local storage fallback

## Architecture

### Data Flow
1. **Conversations**: Stored in Supabase with local storage fallback
2. **Goals**: Immediately saved to local storage, then synced to Supabase
3. **User Profiles**: Cached locally with database synchronization
4. **AI State**: Managed in-memory with conversation context

### Offline Support
- **Local Storage Fallback**: All data operations work offline
- **Automatic Sync**: Data syncs when connection is restored
- **Graceful Degradation**: Full functionality without internet

## Troubleshooting

### Authentication Errors
If you see errors like "JWSError JWSInvalidSignature" or 401 Unauthorized:
1. Verify your Supabase credentials are correct
2. Check that you're using the anon/public key, not the service role key
3. Ensure your project URL is correct
4. Restart your development server

### Database Connection Issues
- Make sure your Supabase project is active
- Check that RLS (Row Level Security) policies are properly configured
- Verify your database migrations have been applied

### Goal Tracking Issues
- Goals are saved to local storage immediately for instant visibility
- If goals don't appear, check browser console for errors
- Local storage fallback ensures goals persist even without internet

## Performance Optimizations

- **Lazy Loading**: Components load on demand
- **Local Storage Caching**: Reduces database calls
- **Optimistic Updates**: UI updates immediately before database sync
- **Efficient Re-renders**: Minimal state updates and memoization

## License

MIT License