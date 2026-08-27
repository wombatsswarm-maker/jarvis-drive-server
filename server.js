// Jarvis Drive Sync Backend
// ---------------------------------------------
// This tiny server holds your Google OAuth credentials
// and exposes ONE endpoint: /api/recent-files
// The dashboard polls this endpoint instead of calling
// Google Drive directly (which would expose secrets in the browser).

const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('SAVE THIS REFRESH TOKEN:', tokens.refresh_token);
    res.send('Authorized. Check server logs for the refresh token, save it as GOOGLE_REFRESH_TOKEN, then restart.');
  } catch (err) {
    res.status(500).send('Auth failed: ' + err.message);
  }
});

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

app.get('/api/recent-files', async (req, res) => {
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const result = await drive.files.list({
      pageSize: 5,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, modifiedTime, webViewLink, mimeType)',
    });
    res.json(result.data.files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Jarvis Drive server running on port ${PORT}`));
