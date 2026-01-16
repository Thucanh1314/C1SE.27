# Google OAuth Setup Guide (Fixed)

## 1. Google Cloud Console Configuration
*   **Client Type**: Web application
*   **Authorized redirect URIs**:
    ```
    http://localhost:5000/api/auth/google/callback
    ```
    *(Note: No trailing slash. Must match exactly.)*

## 2. Backend Environment Variables (.env)
Update your `d:\NCKH\Backend\.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
# Explicitly set the callback URL to avoid mismatch
GOOGLE_AUTH_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## 3. Verification
1.  Restart the backend (`npm run dev`).
2.  Watch the backend logs for: `[GOOGLE_OAUTH] redirect_uri=...`
3.  Visit `http://localhost:5000/api/auth/google`.
4.  It should redirect to Google. Check the address bar for `redirect_uri` parameter.
