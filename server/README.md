# LowCodeAPI Server

A backend that provides a unified API gateway for third-party service integrations.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Database**: MySQL 8.0+ or PostgreSQL 12+ (see [Database Setup](#database-setup))
- **Redis** (for sessions and caching)

### Installation

1. **Install dependencies:**
```bash
cd lowcodeapi/server
npm install
# or
yarn install
```

2. **Environment configuration:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database setup:**
```bash
# The server supports both MySQL and PostgreSQL
# Set your DATABASE_URL in .env file (see Environment Variables below)

# Generate Prisma schema for your database
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

4. **Start development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or your configured port).

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Testing
npm run test         # Run tests with coverage
```

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
# Option 1: MySQL
DATABASE_URL=mysql://user:password@localhost:3306/lowcodeapi

# Option 2: PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/lowcodeapi

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

```

## 🔧 Configuration

### Database Setup

The server supports both **MySQL** and **PostgreSQL** databases:

- **MySQL 8.0+**: Fully supported, original database
- **PostgreSQL 12+**: Fully supported, recommended for new deployments

#### Switching Database Providers

The server automatically detects the database provider from your `DATABASE_URL`:

```bash
# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/database

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

#### Prisma Schema Generation

The Prisma schema is automatically generated based on your database provider:

```bash
# Auto-detect from DATABASE_URL
npm run prisma:generate

# Or explicitly specify provider
DB_PROVIDER=mysql npm run prisma:generate
DB_PROVIDER=postgresql npm run prisma:generate
```

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t lowcodeapi-server .

# Run container
docker run -p 3001:3001 lowcodeapi-server
```

### PM2 Process Manager

```bash
# Start with PM2
pm2 start dist/bin/www --name lowcodeapi-server

# Monitor processes
pm2 status
pm2 logs lowcodeapi-server
```
