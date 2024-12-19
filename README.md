# Grocerease - Telegram Grocery List Bot 🛒

A Telegram bot that helps you manage your grocery shopping lists efficiently. Share lists with family members, track items, and never forget what you need to buy again!

## Features

- Create and manage multiple shopping lists
- Share lists with family members or roommates
- Add, remove, and mark items as purchased
- Organize items by categories
- Easy to use Telegram interface

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat and send `/newbot`
3. Follow the prompts to:
   - Set a name for your bot
   - Choose a username (must end in 'bot')
4. BotFather will give you a token - save this for the `TELEGRAM_BOT_TOKEN` environment variable
5. Start a chat with your new bot and send a message to it

### 2. Get Your Telegram User ID

1. Send a message to [@userinfobot](https://t.me/userinfobot)
2. It will reply with your Telegram user ID
3. Collect IDs from all users who should have access to the bot

## Quick Start with Docker

The easiest way to get started is using Docker:

```bash
docker pull twenty5/grocerease
docker run -d \
  -e TELEGRAM_BOT_TOKEN='your_bot_token' \
  -e ALLOWED_USER_IDS='123456,789012' \
  twenty5/grocerease
```

## Environment Variables

The following environment variables are required:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot Token from BotFather |
| `ALLOWED_USER_IDS` | Comma-separated list of Telegram user IDs that can access the bot |

## Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/Osamah/telegram-grocerylist.git
cd telegram-grocerylist
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_USER_IDS=123456,789012
```

4. Start the bot:
```bash
npm start
```

## Usage

1. Start a chat with your bot on Telegram
2. Use `/start` to begin
3. Features:
   - Create a new shopping list
   - Add items to your current list
   - Remove items