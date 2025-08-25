# XP & Leveling System Report

## Summary of New Features

This pull request introduces a comprehensive XP and leveling system to the modOS Telegram bot. The system is designed to increase user engagement by rewarding them for their participation in the community.

The key features are:

*   **XP & Leveling System:** Users now earn Experience Points (XP) for sending messages in the chat. As they accumulate XP, they level up.
*   **In-Chat Commands:** A new `/level` command allows users to check their current level, XP, and progress to the next level.
*   **Level-Up Notifications:** The bot sends a congratulatory GIF message when a user levels up.
*   **Dynamic, Project-Aware Dashboard:** The dashboard has been refactored to support multiple projects. It now features dynamic routing and a project selection screen.
*   **Leaderboard:** A new leaderboard page in the dashboard displays the top 100 users, ranked by XP. The leaderboard is a modern, responsive UI with features like skeleton loading and list virtualization for a smooth user experience.

## Leveling Formula

The leveling formula is based on an exponential curve to make early levels easier to achieve and later levels more challenging. The formula for the required XP to reach the next level is:

`requiredXpForNextLevel = 150 * (currentLevel ^ 1.5)`

## Testing Guide

### Testing the `/level` Command

1.  In a Telegram group where the bot is an admin, send a few messages to earn some XP.
2.  Type the `/level` command.
3.  The bot should respond with your current level, XP, and a progress bar showing your progress to the next level.

### Viewing the Leaderboard

1.  Log in to the modOS dashboard.
2.  If you are an admin of multiple projects, you will be prompted to select a project.
3.  Once you are on the dashboard for a specific project, you will see a "Leaderboard" link in the navigation menu.
4.  Click on the "Leaderboard" link.
5.  The leaderboard page will display the top 100 users in the project, ranked by their XP. You can see their level, total XP, and progress to the next level.
6.  The leaderboard page should be responsive and scroll smoothly, even with a large number of users.
7.  At the bottom of the page, a sticky element will show your own rank.
