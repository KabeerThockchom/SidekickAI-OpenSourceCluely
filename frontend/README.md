# React Frontend with Liquid Glass Effects

Modern React frontend for the Real-time Speech-to-Text system featuring stunning Apple-style liquid glass effects.

## ✨ Features

- **🎨 Liquid Glass UI** - Apple's glassmorphism effects using [liquid-glass-react](https://github.com/rdev/liquid-glass-react)
- **⚡ Real-time Updates** - WebSocket integration for instant transcripts, questions, and answers
- **📱 Responsive Design** - Works beautifully on desktop and mobile
- **🎭 Smooth Animations** - Slide-in, pop-in, and fade effects for all content
- **💪 TypeScript** - Fully typed for excellent developer experience
- **🎯 Auto-reconnect** - Automatic WebSocket reconnection with visual feedback
- **🔍 Lucide Icons** - Beautiful, consistent iconography

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

### StatusIndicator
- Shows connection status (Connected/Disconnected/Reconnecting)
- Pulsing green dot when connected
- Spinning icon during reconnection
- Displays reconnection attempt count

### TranscriptPanel
- Displays up to 20 most recent transcripts
- Shows confidence scores with visual indicators
- Auto-scrolls to newest content
- Empty state with helpful message

### QuestionsPanel
- Shows up to 10 detected questions
- Click any question to get an AI answer
- Visual feedback on click
- Hover effects for better UX

### AnswersPanel
- Displays up to 10 most recent answers
- Shows question and answer together
- Beautiful question/answer formatting with icons
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

## 🎭 Liquid Glass Effects

Each component uses different liquid glass settings for visual variety:

### Header
```typescript
displacementScale: 65
elasticity: 0.28
aberrationIntensity: 2.8
```

### Panels (Transcripts, Questions, Answers)
```typescript
displacementScale: 58
elasticity: 0.22
aberrationIntensity: 2.2
```

### Cards (Individual items)
```typescript
displacementScale: 38-48
elasticity: 0.12-0.32
aberrationIntensity: 1-2
```

### Status Indicator
```typescript
displacementScale: 35
elasticity: 0.18
aberrationIntensity: 1.2
```

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

## 🎨 Styling

### Gradient Background
Beautiful purple gradient: `#667eea` → `#764ba2` → purple-900

### Custom Scrollbars
- Thin, semi-transparent scrollbars
- Smooth hover effects
- Matches glass aesthetic

### Animations
- **slide-in**: Transcripts slide from left (0.3s)
- **pop-in**: Questions/answers scale up (0.4s with bounce)
- **fade-in**: General fade effects (0.2s)
- **pulse-slow**: Status indicator (2s infinite)

## 🌍 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended - full displacement effects |
| Edge | ✅ Full | Full support including displacement |
| Safari | ⚠️ Partial | No displacement, blur/frost only |
| Firefox | ⚠️ Partial | No displacement, blur/frost only |

**Best experience**: Chrome or Edge

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
- **liquid-glass-react** (^1.1.1) - Liquid glass effects
- **lucide-react** (^0.263.1) - Icon library

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

1. **Adjust Glass Effects**: Modify `displacementScale`, `elasticity`, and `aberrationIntensity` in components
2. **Change Colors**: Update `tailwind.config.js` color palette
3. **Modify Animations**: Edit keyframes in `tailwind.config.js`
4. **Limit Items**: Change MAX_TRANSCRIPTS, MAX_QUESTIONS, MAX_ANSWERS in `useWebSocket.ts`

## 🐛 Troubleshooting

**WebSocket not connecting:**
- Check backend is running on port 8000
- Verify `/ws` endpoint is accessible
- Look for CORS issues in console

**Liquid glass not working:**
- Use Chrome or Edge for full effects
- Check for JavaScript errors
- Verify liquid-glass-react is installed

**Build fails:**
- Run `npm install` to ensure all dependencies
- Check TypeScript errors with `npm run lint`
- Clear node_modules and reinstall if needed

## 📝 License

MIT License - Feel free to use and modify!
