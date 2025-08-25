# **App Name**: DeekFi Guardian

## Core Features:

- New User Detection: Detect when a new user joins the Telegram channel.
- Automatic Restriction (Pre-Verification Mute): Automatically restrict new users' permissions upon joining to prevent spam. Only read message permission is granted to new users until they are verified.
- Welcome Message with CAPTCHA: Send a single, personalized welcome message that tags the new user (e.g., "Welcome, @Deeks!"). The message will contain a CAPTCHA challenge using inline buttons with randomized emojis.
- Verification Logic: Implement verification logic to unmute users who correctly solve the CAPTCHA. Grant them standard chat permissions and post an ephemeral confirmation message (e.g., "Verification successful!"). All messages related to the welcome/CAPTCHA process will be automatically removed to keep the chat clean.
- Failure Logic: Implement failure logic to kick and ban users who fail the CAPTCHA challenge.
Timeout: A configurable timer (e.g., 120 seconds) will trigger a kick/ban if the user is idle.
Retries: Allow a configurable number of retries (e.g., 2 attempts). After the final failed attempt, the user is kicked/banned.
Cleanup: After a kick/ban, delete the welcome/CAPTCHA message. The bot should also attempt to delete Telegram's native "user has joined" system message to further reduce clutter.
- Admin Controls: /verify @username or by replying /verify: Manually verifies a user, bypassing the CAPTCHA.
/reload_config: Securely reloads the bot's configuration (timeouts, message text, etc.) without a full restart.
/guardian_status: An admin command to check the bot's operational status, uptime, and the number of users verified/kicked in the last 24 hours.
/unban @username: A command to allow an admin to remove a user from the bot's internal ban list, allowing them to rejoin and try the CAPTCHA again.
- Event Logging: Log key events (user joined, user verified, user failed/kicked, admin manual verify) to a private, admin-only Telegram channel. This provides a real-time, easily accessible audit trail.
- Rate Limiting: The bot must have internal rate limiting to prevent being spammed by rapid join/leave attacks.
- Known Spammer Database Integration (Optional but Recommended): Integrate with a public API for known spammers (like Combot's CAS system) to automatically ban malicious users on sight, before they even see the CAPTCHA.
- Data Minimization: The bot should only store the Telegram User ID and join timestamp for users pending verification. Once a user is verified or kicked, their data must be immediately purged from the bot's active database to respect user privacy.
- Multi-User Join Handling: The bot must be able to gracefully handle multiple users joining at once, issuing a single welcome message that tags all new users and processing their verifications independently.
- Feedback on Wrong CAPTCHA: When a user clicks the wrong emoji, the bot should provide immediate feedback by editing the original message (e.g., "That's not it, try again! You have 1 attempt left.") instead of posting a new message.
- Silent Kicks: When a user is kicked for failing verification, the action should be as silent as possible, with no "User was kicked by DeekFi Guardian" message posted in the main chat. The kick should only be noted in the private admin log channel.

## Style Guidelines:

- Primary color: Dark blue (`#30475E`) to evoke a sense of security and trustworthiness, important for a gatekeeper bot.
- Background color: Very dark gray (`#1A1A1A`) to maintain a sleek, modern appearance suitable for Telegram's dark mode.
- Accent color: Teal (`#46B29D`) to highlight important interactive elements like the CAPTCHA buttons and confirmation messages, providing a clear visual cue for the user.
- Body and headline font: 'Inter', a sans-serif font that provides a clean, modern, and readable interface, ideal for quick interactions within Telegram. This choice simplifies both headings and body text in the welcome message.
- Use clear, simple icons for admin commands to enhance usability in any potential future UI.
- Ensure the CAPTCHA buttons are well-spaced and easily tappable on mobile devices.
- Use subtle animations or message edits for confirmation messages to provide clear feedback to the user without being intrusive.