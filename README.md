# Fragments

A RESTful microservice API built with Express.js for managing text and binary fragments with advanced features including versioning, format conversion, and scalable cloud deployment.

## Overview

The Fragments API is a robust, cloud-native microservice designed to handle small pieces of text and binary data (fragments) with full CRUD operations, automatic format conversion, version control, and enterprise-grade security. Built for massive scalability on AWS infrastructure.

## Features

- **Full CRUD Operations**: Create, read, update, and delete fragments
- **Multiple Content Types**: Support for text, markdown, HTML, JSON, YAML, and various image formats
- **Format Conversion**: Automatic conversion between compatible formats without additional storage costs
- **Version Control**: Comprehensive versioning system with restoration capabilities
- **Advanced Search**: Search fragments by type, size, date ranges, and content
- **Secure Authentication**: OAuth-based user authentication with proper authorization
- **Cloud-Native**: Built for AWS with DynamoDB, S3, and Cognito integration
- **Auto-scaling**: Designed to handle massive data loads with horizontal scaling
- **CI/CD Pipeline**: Automated testing, building, and deployment via GitHub Actions

## Prerequisites

- **Node.js** (v16+ recommended)
- **npm** (comes with Node.js)
- **Docker** (for containerized deployment)
- **AWS Account** (for cloud deployment)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cSuarez13/fragments.git
   cd fragments
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**: Create a `.env` file in the project root:
   ```env
   # API Configuration
   PORT=8080
   NODE_ENV=development
   LOG_LEVEL=debug
   
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-fragments-bucket
   AWS_COGNITO_POOL_ID=your-cognito-pool-id
   AWS_COGNITO_CLIENT_ID=your-cognito-client-id
   
   # Database Configuration (for local development)
   DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
   ```

## Scripts

### Development

- **Start the server**:
  ```bash
  npm start
  ```
  Runs the app in production mode on port 8080.

- **Development mode** (with auto-restart):
  ```bash
  npm run dev
  ```
  Automatically restarts the server on file changes using nodemon.

- **Debug mode**:
  ```bash
  npm run debug
  ```
  Starts the server with Node.js debugging enabled.

### Code Quality

- **Linting**:
  ```bash
  npm run lint
  ```
  Checks code for style and syntax errors using ESLint.

### Testing

- **Unit tests**:
  ```bash
  npm test
  ```
  Runs the complete test suite with Jest.

- **Integration tests**:
  ```bash
  npm run test:integration
  ```
  Runs integration tests using Hurl against a running instance.

### Docker

- **Build container**:
  ```bash
  docker build -t fragments .
  ```

- **Run container**:
  ```bash
  docker run -p 8080:8080 fragments
  ```

- **Docker Compose** (with local AWS services):
  ```bash
  docker compose up -d
  ```

### Health Check

Verify the server is running:

**Linux/macOS**:
```bash
curl http://localhost:8080
curl -s http://localhost:8080 | jq
```

**Windows (PowerShell)**:
```powershell
curl.exe -s http://localhost:8080 | jq
```

## Supported Fragment Types

### Text Formats
| Name | MIME Type | Extension | Conversions |
|------|-----------|-----------|-------------|
| Plain Text | `text/plain` | `.txt` | - |
| Markdown | `text/markdown` | `.md` | → HTML |
| HTML | `text/html` | `.html` | - |
| CSV | `text/csv` | `.csv` | - |
| JSON | `application/json` | `.json` | - |
| YAML | `application/yaml` | `.yml` | - |

### Image Formats
| Name | MIME Type | Extension | Conversions |
|------|-----------|-----------|-------------|
| PNG | `image/png` | `.png` | ↔ JPEG, WebP, AVIF |
| JPEG | `image/jpeg` | `.jpg` | ↔ PNG, WebP, AVIF |
| WebP | `image/webp` | `.webp` | ↔ PNG, JPEG, AVIF |
| AVIF | `image/avif` | `.avif` | ↔ PNG, JPEG, WebP |
| GIF | `image/gif` | `.gif` | - |

## API Documentation

### Base URL
```
https://your-api-domain.com/v1
```

### Authentication
All endpoints require HTTP Basic Authentication or Bearer token:
```bash
curl -u username@email.com:password https://api.example.com/v1/fragments
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/v1/fragments` | Get user's fragments |
| `GET` | `/v1/fragments/:id` | Get fragment by ID |
| `GET` | `/v1/fragments/:id/info` | Get fragment metadata |
| `GET` | `/v1/fragments/:id.:ext` | Get fragment in specific format |
| `POST` | `/v1/fragments` | Create new fragment |
| `PUT` | `/v1/fragments/:id` | Update existing fragment |
| `DELETE` | `/v1/fragments/:id` | Delete fragment |

### Advanced Features

#### Version Management
- `GET /v1/fragments/:id/versions` - List fragment versions
- `GET /v1/fragments/:id/versions/:version` - Get specific version
- `POST /v1/fragments/:id/versions/:version/restore` - Restore version

#### Search & Filtering
```bash
# Search by content type
GET /v1/fragments?type=text/markdown

# Search by size range
GET /v1/fragments?minSize=100&maxSize=1000

# Search by date range
GET /v1/fragments?from=2024-01-01&to=2024-12-31
```

### Example API Usage

#### Create a Fragment
```bash
curl -X POST \
  -u user@email.com:password \
  -H "Content-Type: text/markdown" \
  -d "# Hello World\nThis is a **markdown** fragment." \
  https://api.example.com/v1/fragments
```

#### Get Fragment as HTML
```bash
curl -u user@email.com:password \
  https://api.example.com/v1/fragments/abc123.html
```

#### Upload Image Fragment
```bash
curl -X POST \
  -u user@email.com:password \
  -H "Content-Type: image/jpeg" \
  --data-binary @image.jpg \
  https://api.example.com/v1/fragments
```

## Architecture

### Technology Stack
- **Runtime**: Node.js with Express.js framework
- **Database**: AWS DynamoDB for metadata, S3 for binary storage
- **Authentication**: AWS Cognito with OAuth 2.0
- **Containerization**: Docker with multi-stage builds
- **Cloud Platform**: AWS ECS, ECR, Application Load Balancer

### Project Structure
```
fragments/
├── src/
│   ├── routes/           # API route handlers
│   ├── model/            # Data models and database logic
│   ├── auth/             # Authentication middleware
│   ├── utils/            # Utility functions
│   └── app.js            # Express application setup
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── .github/
│   └── workflows/        # CI/CD workflows
├── docker-compose.yml    # Local development setup
├── Dockerfile           # Container build instructions
└── package.json         # Dependencies and scripts
```

### Security Features
- Input validation and sanitization
- Rate limiting and request throttling
- Secure headers with Helmet.js
- CORS configuration
- Authentication and authorization
- Data encryption at rest and in transit

## Deployment

### Local Development
1. Start local AWS services: `docker compose up -d`
2. Run setup script: `./scripts/local-aws-setup.sh`
3. Start the API: `npm run dev`

### Production Deployment

#### AWS Infrastructure
The application deploys to AWS using:
- **ECS Cluster**: Container orchestration
- **ECR**: Container registry
- **Application Load Balancer**: Traffic distribution
- **DynamoDB**: Metadata storage
- **S3**: Binary fragment storage
- **Cognito**: User authentication
- **CloudWatch**: Monitoring and logging

#### CI/CD Pipeline
Automated deployment via GitHub Actions:

1. **Continuous Integration** (on pull requests and main branch):
   - ESLint code analysis
   - Dockerfile linting with Hadolint
   - Unit test execution
   - Integration test execution
   - Docker image building and pushing

2. **Continuous Deployment** (on version tags):
   - Build and push to AWS ECR
   - Update ECS task definition
   - Deploy to ECS cluster with zero downtime

#### Deployment Commands
```bash
# Tag a new version
npm version 1.0.0

# Push tag to trigger deployment
git push origin --tags
```

## Monitoring and Observability

### Logging
- Structured JSON logging with Winston
- Configurable log levels (debug, info, warn, error)
- AWS CloudWatch integration
- Request/response logging middleware

### Health Monitoring
- Health check endpoint at `/`
- Container health checks
- AWS ECS health monitoring
- Custom metrics and alarms

### Performance Metrics
- Request latency tracking
- Error rate monitoring
- Fragment storage analytics
- User activity metrics

## Development Guidelines

### Code Style
- ES6+ JavaScript features
- Consistent error handling patterns
- Comprehensive input validation
- Modular architecture with separation of concerns
- Test-driven development (TDD)

### Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Testing Strategy
- **Unit Tests**: Individual function and module testing
- **Integration Tests**: End-to-end API testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability scanning

## Error Handling

The API uses consistent error response format:

```json
{
  "status": "error",
  "error": {
    "code": 400,
    "message": "Detailed error description"
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `415` - Unsupported Media Type
- `500` - Internal Server Error

## Performance and Scalability

### Optimization Features
- Connection pooling for database operations
- Efficient binary data handling with streams
- Caching strategies for frequently accessed data
- Horizontal auto-scaling with ECS
- CDN integration for static content

### Capacity Planning
- Designed to handle millions of fragments
- Auto-scaling based on CPU and memory metrics
- Load balancing across multiple container instances
- Database sharding for large-scale deployments

## Support and Contact

- **Repository**: [GitHub](https://github.com/cSuarez13/fragments)
- **UI Repository**: [GitHub](https://github.com/cSuarez13/fragments-ui)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: API documentation available at `/docs` endpoint
- **Support**: Create an issue for technical support

## 🎥 Demo Video
Watch the full demo: https://youtu.be/3HtiJwWAnWk

This guide walks through the key features demonstrated in the video and provides a step-by-step overview of the Fragments UI application.

