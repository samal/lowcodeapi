<div align="center">
  <a href="https://github.com/samal/lowcodeapi">
   <img src="guide/images/lowcodeapi.png" alt="Logo">
  </a>
  <h3 align="center">LowCodeAPI</h3>
  <p align="center">A connector for third-party service integrations.</p>
  <div align="center">
    <a href="https://github.com/samal/lowcodeapi/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPLv3-purple" alt="License">
    </a>
  </div>
</div>

## Overview

LowCodeAPI is an unified API connector for integrating with third-party services. It consists of:

- **Server** - Backend API connector (Node.js/Express)
- **UI** - Frontend interface (Next.js)

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+ or PostgreSQL 12+
- Redis
- Docker & Docker Compose (for local development)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samal/lowcodeapi.git
   cd lowcodeapi
   ```

2. **Start services with Docker:**
   ```bash
   cd docker
   docker compose -f docker-compose.dev.yml up
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Setup environment:**
   ```bash
   npm run env
   ```

5. **Setup database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. **Create a user:**
   ```bash
   EMAIL=you@example.com PASSWORD=your_password npm run create
   ```

7. **Start development servers:**
   ```bash
   npm run server/dev  # Backend on http://localhost:3001
   npm run web/dev     # Frontend on http://localhost:3000
   ```

For detailed setup instructions, see the [Getting Started Guide](./guide/how-to-start.md).

## Documentation

- **[Server Documentation](./server/README.md)** - Backend setup and API development
- **[UI Documentation](./ui/README.md)** - Frontend development guide
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute

## Contributors

<a href="https://github.com/samal/lowcodeapi/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=samal/lowcodeapi" alt="Contributors" />
</a>

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/samal/lowcodeapi/issues)
