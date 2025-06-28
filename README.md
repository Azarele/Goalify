# Goalify - AI Coaching Companion

Your AI coaching companion for meaningful conversations and personal growth. Talk or type your way to clarity with Goalify.

## Features

- 🤖 AI-powered coaching conversations
- 🎯 Goal setting and tracking
- 📊 Progress dashboard with XP and levels
- 🔥 Daily streak tracking
- 🎤 Voice input and output (optional)
- 📱 Responsive design for all devices

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

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI GPT-4 for coaching responses
- **Voice**: ElevenLabs for text-to-speech
- **Deployment**: Netlify

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

## License

MIT License