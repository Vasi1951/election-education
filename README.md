# 🗳️ ElectEd — Election Process Education Platform

An interactive, AI-powered web application that helps citizens understand the democratic election process, timelines, voter registration, and civic participation through an engaging and accessible interface.

## 📋 Challenge Vertical

**Election Process Education** — Create an assistant that helps users understand the election process, timelines, and steps in an interactive and easy-to-follow way.

## 🎯 Approach & Logic

### Problem Statement
Many citizens, especially first-time voters, lack a clear understanding of how elections work — from voter registration through government formation. This knowledge gap reduces civic participation and undermines democratic engagement.

### Solution
ElectEd is an interactive education platform that:
1. **Visualizes** the entire election process through an engaging timeline
2. **Explains** each phase with detailed cards and tabbed information panels
3. **Answers** questions via an AI-powered assistant using **Google Gemini API**
4. **Educates** about voter rights, EVMs, election types, and the Model Code of Conduct

### Architecture
```
election-education/
├── server.js              # Express server with security, API proxy, health check
├── package.json           # Dependencies and scripts
├── Dockerfile             # Cloud Run deployment container
├── public/
│   ├── index.html         # Semantic, accessible single-page application
│   ├── css/
│   │   ├── variables.css  # Design tokens and CSS custom properties
│   │   ├── base.css       # Reset, typography, accessibility utilities
│   │   ├── components.css # All UI component styles
│   │   └── animations.css # Animations with reduced-motion support
│   └── js/
│       ├── data.js        # Structured election data and search
│       ├── chat.js        # AI chat module with Gemini integration
│       ├── tabs.js        # Accessible tab panel component (WAI-ARIA)
│       ├── app.js         # Main app initialization
│       └── tests.js       # Comprehensive test suite
```

## 🚀 How the Solution Works

### Key Features

1. **Interactive Election Timeline**  
   Visual step-by-step timeline showing all phases from election announcement to government formation with scroll-triggered animations.

2. **Educational Content Cards**  
   Six detailed cards covering voter registration, candidate nomination, campaigning, polling day, vote counting, and results/formation.

3. **Tabbed Knowledge Base**  
   Deep-dive sections on voter rights, EVMs & VVPAT, election types, and Model Code of Conduct with full keyboard accessibility.

4. **AI-Powered Assistant (Google Gemini)**  
   Real-time Q&A chatbot powered by Google Gemini 2.0 Flash. Users can ask anything about elections, and the AI provides structured, educational responses. Includes:
   - Quick-question buttons for common queries
   - Input sanitization for security
   - Local fallback data if API is unavailable
   - Server-side proxy to protect API keys

5. **Premium Dark Theme UI**  
   Civic-themed design with navy/gold color palette, glassmorphism effects, smooth animations, and responsive layout.

### Google Services Integration

- **Google Gemini AI** — Core AI assistant for answering election questions
- **Google Fonts** — Inter, Outfit, and JetBrains Mono for premium typography
- **Google Analytics** — User engagement tracking
- **Google Cloud Run** — Production deployment infrastructure

## 🔧 Setup & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

Visit `http://localhost:8080` in your browser.

### Using the AI Assistant
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Enter the key in the "Connect Google Gemini" section
3. Start asking questions about elections!

## ✅ Evaluation Criteria Coverage

| Criteria | Implementation |
|----------|---------------|
| **Code Quality** | Modular IIFE pattern, JSDoc comments, clear naming, separation of concerns |
| **Security** | CSP headers, XSS protection, input sanitization, HSTS, rate limiting, session-only key storage |
| **Efficiency** | Lightweight Express server, optimized CSS, lazy animations via IntersectionObserver, minimal dependencies |
| **Testing** | Comprehensive test suite: sanitization, endpoints, accessibility, CSS validation, security headers |
| **Accessibility** | WCAG 2.1 AA: ARIA roles, keyboard navigation, skip links, focus indicators, reduced-motion, semantic HTML |
| **Google Services** | Gemini AI chat, Google Fonts, Google Analytics, Cloud Run deployment ready |

## 📝 Assumptions

- Users have basic internet access and a modern browser (Chrome, Firefox, Edge, Safari)
- The Gemini API key is provided by the user (free tier sufficient)
- Election process information is based on general democratic principles (primarily Indian electoral system)
- The application serves as an educational tool, not an official government resource

## 👤 Author

**Mamidi Vashisht**  
Built with ❤️ for the PromptWars Virtual Hackathon — Challenge 2

## 📄 License

MIT License
