# PUT YOUR BOT FILES HERE

This `bot/` directory is where your KnightBot files go.

## Required files to copy into this folder:

```
bot/
├── index.js          ← Main bot entry point
├── package.json      ← Bot dependencies
├── main.js           ← Message handler
├── settings.js       ← Bot settings
├── settings.json     ← Bot config
├── cleanup.js        ← If present
├── /commands/        ← All command files
├── /lib/             ← Library files (exif, myfunc, etc.)
├── /data/            ← Data files (owner.json, etc.)
└── /session/         ← DO NOT copy this — sessions are managed automatically per user
```

## IMPORTANT: The bot's index.js needs one small modification

The bot needs to read the session path and phone number from environment variables
so each user gets their own session. Add these lines near the top of index.js,
replacing the hardcoded values:

```js
// Replace: let phoneNumber = "911234567890"
// With:
let phoneNumber = process.env.FORCE_PHONE || process.env.PHONE_NUMBER || "911234567890"

// Replace: useMultiFileAuthState('./session')  
// With:
useMultiFileAuthState(process.env.FORCE_SESSION_PATH || process.env.SESSION_PATH || './session')
```

That's the only change needed. The server handles everything else.

## After copying files, run:

```bash
cd bot
npm install
cd ..
npm install
npm start
```
