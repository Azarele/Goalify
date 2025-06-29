import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Verifying authentication...');
        
        // Get the current URL hash and search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check for error in URL
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        
        if (error) {
          console.error('Auth error from URL:', error, errorDescription);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => navigate('/auth?error=callback_failed'), 2000);
          return;
        }

        // Handle the auth callback - this will process the tokens from the URL
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => navigate('/auth?error=callback_failed'), 2000);
          return;
        }

        if (data.session) {
          setStatus('Authentication successful! Redirecting...');
          // Successfully authenticated, redirect to main app
          setTimeout(() => navigate('/'), 1000);
        } else {
          // Try to get session from URL hash
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            setStatus('Setting up session...');
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (setSessionError) {
              console.error('Set session error:', setSessionError);
              setStatus('Authentication failed. Redirecting...');
              setTimeout(() => navigate('/auth?error=callback_failed'), 2000);
              return;
            }
            
            if (sessionData.session) {
              setStatus('Authentication successful! Redirecting...');
              setTimeout(() => navigate('/'), 1000);
              return;
            }
          }
          
          setStatus('No session found. Redirecting...');
          setTimeout(() => navigate('/auth'), 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => navigate('/auth?error=callback_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-xl">G</span>
          </div>
        </div>
        <p className="text-purple-300 text-lg">{status}</p>
      </div>
    </div>
  );
};