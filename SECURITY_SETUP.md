# Netlify Security Configuration Guide

## 1. Environment Variables Security
In your Netlify dashboard:
- Go to **Site settings** → **Environment variables**
- Ensure all sensitive variables are set here (never in code)
- Use descriptive names but don't expose sensitive info in variable names

Required variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_key (optional)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key (optional)
```

## 2. Domain & DNS Security
- **Custom Domain**: Set up a custom domain for better trust signals
- **DNS Security**: Enable DNSSEC if your domain provider supports it
- **Subdomain Protection**: Ensure wildcard certificates are properly configured

## 3. Access Control
In Netlify dashboard → **Site settings** → **Access control**:
- Enable **Password protection** for staging/preview deployments
- Set up **Role-based access** for team members
- Configure **Branch deploy controls**

## 4. Build & Deploy Security
- **Build hooks**: Secure your build hooks and don't expose them publicly
- **Deploy notifications**: Set up notifications for unauthorized deployments
- **Build environment**: Ensure build environment is isolated

## 5. Forms & Functions Security (if used)
- **Spam protection**: Enable Netlify's built-in spam filtering
- **Rate limiting**: Configure rate limits for form submissions
- **Webhook security**: Use webhook signatures for verification

## 6. Analytics & Monitoring
- **Analytics**: Enable Netlify Analytics for traffic monitoring
- **Error tracking**: Set up error monitoring
- **Performance monitoring**: Monitor Core Web Vitals

## 7. Additional Security Headers
The following are already configured in netlify.toml:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

## 8. SSL/TLS Configuration
- **Auto-SSL**: Netlify provides automatic SSL certificates
- **Force HTTPS**: Already configured in headers
- **Certificate monitoring**: Monitor certificate expiration

## 9. Security Scanning
Regular security checks:
- Use tools like Mozilla Observatory
- Run Lighthouse security audits
- Check SSL Labs SSL Test
- Monitor Google Safe Browsing status

## 10. Incident Response
- **Security contact**: Set up security@yourdomain.com
- **Incident response plan**: Document steps for security incidents
- **Backup strategy**: Ensure you can quickly restore from backups

## Quick Security Checklist:
- [ ] Environment variables properly set in Netlify dashboard
- [ ] Custom domain configured with SSL
- [ ] Security headers implemented (✅ Done)
- [ ] Access controls configured
- [ ] Build security measures in place
- [ ] Monitoring and alerting set up
- [ ] Regular security audits scheduled
- [ ] Incident response plan documented

## Testing Your Security:
1. **Mozilla Observatory**: https://observatory.mozilla.org/
2. **SSL Labs**: https://www.ssllabs.com/ssltest/
3. **Security Headers**: https://securityheaders.com/
4. **Google Safe Browsing**: https://transparencyreport.google.com/safe-browsing/search