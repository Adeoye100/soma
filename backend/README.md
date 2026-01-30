# Smart Examination Backend Service

A secure, production-ready Node.js backend service that interfaces with Google's Gemini API to process student and educator requests from the React-based Smart Examination Web App.

## 🚀 Features

- **Secure API Integration**: Robust connection to Google Gemini API with multiple key rotation
- **Authentication & Authorization**: JWT-based authentication system
- **Rate Limiting**: Advanced request queuing and rate limiting
- **Input Validation**: Comprehensive input sanitization and validation
- **Error Handling**: Exponential backoff, retry logic, and detailed error responses
- **Logging & Monitoring**: Comprehensive logging with structured logging and monitoring
- **Security**: CORS configuration, API key management, security headers
- **Scalability**: Designed for concurrent requests with proper resource management
- **Compliance**: Data privacy and security compliance standards

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Authentication, validation, rate limiting
│   ├── services/            # Business logic and API integrations
│   ├── models/              # Data models and interfaces
│   ├── routes/              # API route definitions
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── app.ts              # Express application setup
├── tests/                   # Test files
├── docs/                    # API documentation
├── docker/                  # Docker configuration
├── package.json
├── tsconfig.json
└── .env.example
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Redis-based rate limiting with request queuing
- **Validation**: Joi for input validation and sanitization
- **Logging**: Winston for structured logging
- **Security**: Helmet, CORS, bcrypt for password hashing
- **API Integration**: Google Gemini API with enhanced error handling
- **Monitoring**: Health checks, metrics collection
- **Testing**: Jest for unit and integration tests

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure environment variables
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Exam Management
- `POST /api/exams/generate` - Generate exam questions
- `POST /api/exams/evaluate` - Evaluate student answers
- `GET /api/exams/history` - Get exam history
- `GET /api/exams/:id` - Get specific exam details

### Health & Monitoring
- `GET /health` - Health check endpoint
- `GET /metrics` - Application metrics
- `GET /api/status` - Service status and API key information

## 🔒 Security Features

- **API Key Management**: Secure storage and rotation of Gemini API keys
- **Input Sanitization**: All inputs are validated and sanitized
- **CORS Configuration**: Configurable CORS policies
- **Security Headers**: Comprehensive security headers via Helmet
- **Rate Limiting**: Protection against abuse and DDoS
- **Request Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses without information leakage

## 📊 Monitoring & Logging

- **Structured Logging**: JSON-formatted logs with Winston
- **Performance Monitoring**: Request timing and performance metrics
- **Error Tracking**: Comprehensive error logging and alerting
- **Health Checks**: System health monitoring
- **API Key Status**: Real-time API key rotation monitoring

## 🚀 Deployment

### Docker Deployment
```bash
docker build -t smart-exam-backend .
docker run -p 3000:3000 smart-exam-backend
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
GEMINI_API_KEYS=key1,key2,key3
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📖 API Documentation

Full API documentation is available at `/docs` when running the server.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.