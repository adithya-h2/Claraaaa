# CLARA - The AI Receptionist

<div align="center">

![Clara](https://img.shields.io/badge/Clara-AI%20Studio-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-Private-red)

**A unified monorepo platform enabling real-time video calls, AI-powered chat assistance, and comprehensive team collaboration tools.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

Clara is a comprehensive communication and collaboration platform that combines real-time video calling, AI-powered chat assistance, and productivity tools in a unified monorepo architecture. The platform enables seamless interaction between clients and staff members through WebRTC-based video calls, intelligent AI chat powered by Google Gemini, and a suite of collaboration features including meeting management, timetables, tasks, and team directories.

### Key Highlights

- **Real-time Video Communication**: WebRTC-based video calling with robust signaling and connection management
- **AI-Powered Assistant**: Intelligent chat assistant leveraging Google Gemini for natural language interactions
- **Secure Authentication**: JWT-based authentication with token refresh and rate limiting
- **Real-time Notifications**: Socket.IO-powered notification system with synchronization across clients
- **Productivity Suite**: Meeting management, timetable scheduling, task tracking, and team collaboration tools
- **Production-Ready**: Comprehensive error handling, encoding validation, and deployment configurations

## ✨ Features

### 🎥 Video Communication
- **WebRTC Video Calls**: Real-time peer-to-peer video communication between clients and staff
- **Call Management**: Initiate, accept, decline, and manage video calls with status tracking
- **SDP/ICE Signaling**: Robust WebRTC signaling via Socket.IO for reliable connection establishment
- **Call Lifecycle Management**: CAS-protected call states to prevent race conditions
- **TURN Server Support**: Optional TURN server configuration for NAT traversal

### 🤖 AI Chat Assistant
- **Google Gemini Integration**: Advanced AI-powered conversational capabilities
- **Multi-language Support**: Automatic language detection and response
- **Context-Aware Responses**: Intelligent conversation context management
- **Text-to-Speech**: Voice output for enhanced user experience

### 🔔 Real-time Notifications
- **Socket.IO Integration**: Real-time notification delivery across all clients
- **Notification Persistence**: Unread tracking and read status management
- **Synchronization**: Cross-device notification sync
- **Call Notifications**: Real-time alerts for incoming calls and call status updates

### 👥 Team Collaboration
- **Meeting Management**: Schedule, view, and manage meetings with AI-powered summaries
- **Timetable Management**: Personal timetable with per-user persistence
- **Task Management**: Task tracking and management system
- **Team Directory**: Team member directory with group chat functionality
- **HOD Privileges**: Head of Department role-based access control

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Rate Limiting**: API and authentication endpoint rate limiting
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Request Validation**: Zod schema-based payload validation
- **Token Refresh**: Automatic token refresh mechanism

### 🛠️ Developer Experience
- **Monorepo Architecture**: Unified workspace with shared packages
- **TypeScript**: Full type safety across frontend and backend
- **Hot Reload**: Fast development with Vite HMR
- **Encoding Validation**: Automated encoding checks to prevent issues
- **Health Checks**: Comprehensive health check endpoints
- **Development Scripts**: Convenient scripts for Windows and cross-platform development

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Framer Motion** - Smooth animations
- **Zustand** - State management
- **Google Gemini API** - AI chat capabilities

### Backend
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Primary database (with in-memory fallback)
- **MongoDB** - Additional data storage
- **JWT** - Authentication tokens
- **Zod** - Schema validation
- **TypeScript** - Type-safe backend development

### Infrastructure
- **Docker** - Containerization support
- **Nginx** - Reverse proxy configuration
- **Node.js 18+** - Runtime environment

## 🏗️ Architecture

The project follows a monorepo structure with clear separation of concerns:


### Application Ports

- **Client App**: `http://localhost:5173`
- **Staff App**: `http://localhost:5174`
- **Server API**: `http://localhost:8080`

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **pnpm** package manager
- **PostgreSQL** (optional, falls back to in-memory storage)
- **Git** for version control

### Installation

1. **Clone the repository**
 
   git clone <repository-url>
   cd clara-with-face/CLARA_WOW/deploy-clara
   2. **Install dependencies**
   npm install
   3. **Configure environment variables**h
   cp env.example .env
      Edit `.env` with your configuration:
   NODE_ENV=development
   SERVER_PORT=8080
   JWT_SECRET=your-secret-key-here
   ENABLE_UNIFIED_MODE=true
   DATABASE_URL=postgres://user:pass@localhost:5432/clara
   GEMINI_API_KEY=your-gemini-api-key
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:8080
   4. **Start development servers**
   npm run dev
      This starts all services:
   - Client app on `http://localhost:5173`
   - Staff app on `http://localhost:5174`
   - Server API on `http://localhost:8080`

## 💻 Development

### Available Scripts

# Start all services in development mode
npm run dev

# Start individual services
npm run dev:server      # Server only
npm run dev:client      # Client only
npm run dev:staff       # Staff only

# Build all applications
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Check encoding issues
npm run check:encoding

# Fix encoding issues
npm run fix:encoding### Development Workflow

1. **Feature Flag**: The `ENABLE_UNIFIED_MODE` environment variable controls unified server behavior
   - `false` (default): Client runs independently
   - `true`: Unified server serves all apps and APIs

2. **Hot Reload**: All frontend apps support hot module replacement via Vite

3. **Type Safety**: TypeScript ensures type safety across the monorepo

4. **Shared Packages**: Use `packages/shared` for common types and utilities

### Windows Development

For Windows users, helper scripts are available:

# PowerShell
.\scripts\start-dev.ps1

# Command Prompt
scripts\start-dev.batThese scripts automatically handle port cleanup and service startup.

## 🚢 Production Deployment

### Build for Production

1. **Build all applications**
   npm run build
   2. **Set production environment variables**
   NODE_ENV=production
   ENABLE_UNIFIED_MODE=true
   JWT_SECRET=your-production-secret
   DATABASE_URL=your-production-database-url
   GEMINI_API_KEY=your-production-gemini-key
   3. **Start production server**
   npm start
   
### Production Server Routes

When `ENABLE_UNIFIED_MODE=true`, the server serves:
- `/` → Client application
- `/staff` → Staff dashboard
- `/api/*` → REST API endpoints
- `/socket` → WebSocket endpoint

### Docker Deployment

cd infra
docker-compose up -d### Render.com Deployment

See `RENDER_DEPLOY.md` for detailed Render.com deployment instructions.

## 📡 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - Staff login and JWT token issuance
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout and token invalidation

### Call Management Endpoints

- `POST /api/calls/initiate` - Initiate a video call
- `POST /api/calls/accept` - Accept an incoming call
- `POST /api/calls/decline` - Decline an incoming call
- `POST /api/calls/sdp` - Send WebRTC SDP offer/answer
- `POST /api/calls/ice` - Send WebRTC ICE candidate
- `GET /api/calls/:callId` - Get call status

### Staff Management Endpoints

- `GET /api/staff/available` - Get available staff members
- `POST /api/staff/availability` - Update staff availability status
- `GET /api/staff/:staffId` - Get staff details

### Notification Endpoints

- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `POST /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/read-all` - Mark all notifications as read

### Health & Status

- `GET /healthz` - Health check endpoint

### Socket.IO Events

**Namespace**: `/rtc`

**Client Events**:
- `call:incoming` - Incoming call notification
- `call:update` - Call status update
- `call:sdp` - SDP offer/answer exchange
- `call:ice` - ICE candidate exchange
- `join:call` - Join call room
- `call:accept` - Call accepted
- `call:decline` - Call declined

## 🔧 Environment Variables

Key environment variables (see `env.example` for complete list):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SERVER_PORT` | Server port | `8080` |
| `JWT_SECRET` | JWT signing secret | Required |
| `ENABLE_UNIFIED_MODE` | Enable unified server | `false` |
| `DATABASE_URL` | PostgreSQL connection string | Optional |
| `GEMINI_API_KEY` | Google Gemini API key | Optional |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173,...` |
| `RING_TIMEOUT_MS` | Call ring timeout | `45000` |
| `TURN_SERVER_URL` | TURN server URL | Optional |
| `SOCKET_PATH` | Socket.IO path | `/socket` |

## 🧪 Testing

### Running Tests
ash
# Run all tests
npm test

# Run server tests only
npm --workspace apps/server test

# Run specific test file
npm --workspace apps/server test <test-file>### Test Coverage

The project includes comprehensive test suites in `testsprite_tests/` covering:
- API endpoint tests
- Socket.IO event handling
- WebRTC signaling flows
- Authentication flows
- Notification system
- Timetable management
- Call lifecycle management

### Test Utilities

Test utilities are available in `testsprite_tests/test_utils/`:
- `api_helpers.py` - API testing helpers
- `socketio_helpers.py` - Socket.IO testing helpers

## 📚 Additional Documentation

- [Development Start Guide](DEV_START_GUIDE.md) - Detailed development setup
- [Integration Guide](INTEGRATION_GUIDE.md) - Integration instructions
- [Render Deployment](RENDER_DEPLOY.md) - Render.com deployment guide
- [Production WebRTC](PRODUCTION_WEBRTC_IMPLEMENTATION.md) - WebRTC production setup
- [Security & Encoding](SECURITY_AND_ENCODING_FIX.md) - Security best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is private and proprietary. All rights reserved.

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Socket.IO for real-time communication
- WebRTC community for peer-to-peer communication standards
- React and Vite teams for excellent developer tools

---

<div align="center">

*Built with ❤️ by The Quantum Bugs*

[Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues) • [Documentation](#-documentation)

</div>
