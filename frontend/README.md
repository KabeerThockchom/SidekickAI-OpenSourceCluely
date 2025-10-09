# SidekickAI - React Frontend

Modern React frontend for SidekickAI featuring a clean, professional interface with real-time updates.

## ✨ Features

- **🎨 Modern UI** - Clean, professional design with Tailwind CSS
- **⚡ Real-time Updates** - WebSocket integration for instant transcripts, questions, and answers
- **📱 Responsive Design** - Works beautifully on desktop and mobile
- **🎭 Smooth Animations** - Polished animations for all content
- **💪 TypeScript** - Fully typed for excellent developer experience
- **🎯 Auto-reconnect** - Automatic WebSocket reconnection with visual feedback
- **🎨 Radix UI Icons** - Beautiful, consistent iconography

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Opens on http://localhost:3000 with hot module replacement.

### Production Build

```bash
npm run build
```

Builds to `dist/` directory. The backend server will serve this build.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── StatusIndicator.tsx     # Connection status with pulsing indicator
│   ├── TranscriptPanel.tsx     # Live transcripts with confidence scores
│   ├── QuestionsPanel.tsx      # Clickable detected questions
│   └── AnswersPanel.tsx        # AI-generated answers display
├── hooks/
│   └── useWebSocket.ts         # WebSocket connection & state management
├── types/
│   └── index.ts                # TypeScript type definitions
├── App.tsx                     # Main application component
├── main.tsx                    # Application entry point
└── index.css                   # Global styles & Tailwind
```

## 🎨 Component Details

### Header
- SidekickAI branding with gradient logo
- Connection status indicator
- Reconnect button when disconnected
- Clean, professional design

### TranscriptPanel
- Displays up to 20 most recent transcripts
- Shows confidence scores with visual indicators
- Source labels (🎤 microphone, 🖥️ system audio)
- Auto-scrolls to newest content
- Empty state with helpful message

### QuestionsPanel
- Shows up to 10 detected questions
- Click any question to get an AI answer
- Visual feedback on click
- Hover effects for better UX

### QAChatPanel
- Displays up to 10 most recent answers
- Shows question and answer together
- Beautiful question/answer formatting
- Timestamps for each answer

## 🔧 Configuration

### Vite Configuration (`vite.config.ts`)
- Dev server on port 3000
- Proxies API requests to backend (port 8000)
- WebSocket proxy for `/ws` endpoint

### Tailwind Configuration (`tailwind.config.js`)
- Custom colors (primary, glass)
- Custom animations (slide-in, pop-in, fade-in, pulse-slow)
- Extended theme for consistent design

### TypeScript Configuration
- Strict mode enabled
- React 19 JSX transform
- Path aliases configured

## 🎨 Styling System

### Tailwind Configuration
- Custom color palette with purple/blue gradients
- Custom animations (slide-in, fade-in, pulse)
- Responsive breakpoints for all screen sizes
- Clean, modern design tokens

### Design Tokens
- Primary gradient: purple-600 → blue-600
- Background: gray-50
- Card backgrounds: white with subtle shadows
- Text hierarchy: gray-900, gray-600, gray-500

## 🌐 WebSocket Protocol

The frontend connects to `/ws` and receives these message types:

### Transcript Message
```json
{
  "type": "transcript",
  "text": "Hello world",
  "timestamp": "12:34:56",
  "confidence": 0.95
}
```

### Question Message
```json
{
  "type": "question",
  "question": "What time is it?",
  "timestamp": "12:34:56",
  "context": "Previous conversation..."
}
```

### Answer Message
```json
{
  "type": "answer",
  "question": "What time is it?",
  "answer": "It is currently 12:34 PM.",
  "timestamp": "12:34:57"
}
```

## 📡 API Integration

### GET Answers
Click a question → Frontend POSTs to `/answer`:

```typescript
POST /answer
{
  "question": "What time is it?",
  "context": "Previous conversation..."
}
```

Response is broadcast via WebSocket to all clients.

## 🌍 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Full support |
| Safari | ✅ Full | Full support |
| Firefox | ✅ Full | Full support |

**Works great in all modern browsers!**

## 🛠️ Development Tips

### Hot Reload
Vite provides instant hot module replacement. Changes appear immediately.

### Type Safety
TypeScript catches errors before runtime. Use type annotations for all props and state.

### Component Testing
Test individual components by importing them directly in App.tsx.

### Debugging WebSocket
Check browser console for WebSocket connection logs:
- ✅ Connected
- 🔌 Closed
- 🔄 Reconnecting

### Performance
- Components are optimized with proper keys
- Animations use CSS transforms (GPU accelerated)
- Lists are limited (20 transcripts, 10 questions, 10 answers)

## 📦 Dependencies

### Production
- **react** & **react-dom** (^19.0.0) - UI framework
- **@radix-ui/react-icons** - Icon library
- **class-variance-authority** & **clsx** - Component variants
- **tailwind-merge** - Tailwind utility merging

### Development
- **vite** - Fast build tool
- **typescript** - Type safety
- **tailwindcss** - Utility-first CSS
- **eslint** - Code linting

## 🚀 Deployment

The production build is served by the FastAPI backend:

1. Build: `npm run build`
2. Files go to `dist/`
3. Backend serves from `frontend/dist/`
4. Access at http://localhost:8000

## 💡 Tips

1. **Change Colors**: Update `tailwind.config.js` color palette
2. **Modify Animations**: Edit keyframes in `tailwind.config.js`
3. **Limit Items**: Change MAX_TRANSCRIPTS, MAX_QUESTIONS, MAX_ANSWERS in `useWebSocket.ts`
4. **Customize Components**: Edit component styles in `src/components/`

## 🐛 Troubleshooting

**WebSocket not connecting:**
- Check backend is running on port 8000
- Verify `/ws` endpoint is accessible
- Look for CORS issues in console

**Build fails:**
- Run `npm install` to ensure all dependencies
- Check TypeScript errors with `npm run lint`
- Clear node_modules and reinstall if needed

**UI issues:**
- Check browser console for errors
- Verify all dependencies are installed
- Try clearing browser cache

## 📝 License

MIT License - Feel free to use and modify!
