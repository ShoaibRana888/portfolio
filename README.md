# 🚀 Portfolio Deployment Guide

This portfolio showcases interactive web experiences and full-stack projects.

## Quick Deploy to Vercel

### Option 1: Drag & Drop (Fastest)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Drag the entire `portfolio-deploy` folder onto the dashboard
3. Done! Your site is live.

### Option 2: GitHub + Vercel (Recommended)

```bash
# 1. Initialize git in this folder
cd portfolio-deploy
git init
git add .
git commit -m "Initial portfolio"

# 2. Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
git branch -M main
git push -u origin main

# 3. Go to vercel.com/new
# 4. Import your GitHub repo
# 5. Click Deploy (no config needed!)
```

## Project Structure

```
portfolio-deploy/
├── public/                    # Static files (served by Vercel)
│   ├── index.html            # Main portfolio page
│   ├── nova-x1-premium.html  # Product landing page demo
│   ├── atmosphere-weather.html # Weather app demo
│   ├── ai-voice-interviewer.html # AI interview demo
│   └── pen-story-v4.html     # Scroll storytelling demo
├── event-booking/            # Full-stack project (separate deployment)
│   ├── backend/
│   │   ├── server.js
│   │   └── database.js
│   └── frontend/
│       └── build/
│           └── index.html
├── package.json
├── vercel.json               # Vercel configuration
└── README.md
```

## Deploying the Event Booking System

The Eventix project requires a Node.js backend and needs separate deployment:

### Deploy to Railway (Recommended for Node.js)

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Upload the `event-booking` folder
4. Railway will auto-detect Node.js
5. Your API will be live at `your-app.railway.app`

### Deploy to Render

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repo (or upload files)
4. Set build command: `npm install`
5. Set start command: `npm start`

### After deploying Eventix:
Update the portfolio link from `https://eventix-demo.vercel.app` to your actual URL.

## Customization Checklist

- [ ] Update email in contact section (`your@email.com`)
- [ ] Add your social media links in footer
- [ ] Update "About Me" text
- [ ] Replace Eventix demo URL with actual deployment
- [ ] Add your custom domain in Vercel settings

## Tech Stack

**Portfolio:**
- Pure HTML/CSS/JS
- Iframe embeds for live demos
- CSS animations & scroll effects

**Eventix (Full-Stack):**
- Node.js + Express
- SQLite (sql.js)
- React (CDN)
- QR code generation

## Live Demo Features

Each project runs as a live iframe preview:
- NOVA X1: 3D carousel, scroll animations
- Weather: Dynamic themes, particle effects
- AI Interviewer: Speech recognition, TTS
- Pen Story: Scroll-driven animations

---

Built with 💜 for showcasing creative work
