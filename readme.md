# Cloud Resume Challenge

A modern, cloud-hosted resume built with AWS serverless architecture, featuring a visitor counter and responsive design.

## Live Demo

Visit the live resume: [Your Cloud Resume URL]

## Project Overview

This project is part of the [Cloud Resume Challenge](https://cloudresumechallenge.dev) and demonstrates full-stack cloud development skills using AWS services. The resume features a visitor counter that tracks unique visitors using serverless architecture.

## Architecture

### Frontend

- **Framework**: JavaScript with Vite
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Features**:
  - Responsive design
  - Dark mode toggle
  - Visitor counter display
  - Modern UI/UX

### Backend

- **Runtime**: Python 3.11 (AWS Lambda)
- **Database**: DynamoDB
- **API**: API Gateway
- **CDN**: CloudFront
- **Infrastructure**: Terraform

### AWS Services Used

- **Lambda**: Serverless function for visitor counting
- **DynamoDB**: NoSQL database for session tracking
- **API Gateway**: RESTful API endpoint
- **CloudFront**: Global CDN for performance
- **S3**: Static website hosting (implied)
- **IAM**: Role-based access control

## Technology Stack

### Frontend

- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS for styling
- Vite for build tooling
- Font Awesome for icons

### Backend

- Python 3.11
- AWS Lambda
- DynamoDB
- Boto3 SDK

### Infrastructure

- Terraform for IaC
- AWS S3 for state management
- CloudFront for global distribution

## Project Structure

```
cloudresume/
├── frontend/
│   ├── index.html          # Main resume page
│   ├── src/
│   │   ├── main.js         # JavaScript functionality
│   │   └── styles.css      # Custom styles
│   ├── package.json        # Dependencies
│   └── vite.config.mjs     # Build configuration
├── backend/
│   ├── lambda_cloudresume/
│   │   ├── app.py          # Lambda function
│   │   ├── package.sh      # Deployment script
│   │   └── tests/          # Unit tests
│   └── terraform/
│       ├── main.tf         # Infrastructure definition
│       ├── variables.tf    # Configuration variables
│       └── output.tf       # Output values
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.11+
- AWS CLI configured
- Terraform installed
- Git

### Frontend Development

1. **Clone the repository**:

   ```bash
   git clone https://github.com/karuifeather/cloudresume.git
   cd cloudresume
   ```

2. **Install dependencies**:

   ```bash
   cd frontend
   yarn install
   ```

3. **Start development server**:

   ```bash
   yarn dev
   ```

4. **Build for production**:
   ```bash
   yarn build
   ```

### Backend Deployment

1. **Configure AWS credentials**:

   ```bash
   aws configure
   ```

2. **Deploy infrastructure**:

   ```bash
   cd backend/terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Deploy Lambda function**:
   ```bash
   cd ../lambda_cloudresume
   ./package.sh
   cd ../terraform
   terraform apply
   ```

## Features

### Visitor Counter

- **Session Tracking**: Prevents duplicate counting for same IP per day
- **Real-time Updates**: Live visitor count display
- **Scalable**: Serverless architecture handles traffic spikes

### Responsive Design

- **Mobile-first**: Optimized for all device sizes
- **Dark Mode**: Toggle between light and dark themes
- **Accessibility**: WCAG compliant design

### Performance

- **CDN**: CloudFront for global content delivery
- **Caching**: Optimized caching strategies
- **Fast Loading**: Minimal JavaScript and CSS

## 🧪 Testing

### Unit Tests

```bash
cd backend/lambda_cloudresume
python -m pytest tests/
```

### Manual Testing

1. Visit the resume page
2. Check visitor counter increments
3. Refresh page - counter should not increment
4. Test responsive design on different devices

## Monitoring

### CloudWatch Logs

- Lambda function logs
- API Gateway logs
- Error tracking and debugging

### Metrics

- Visitor count tracking
- API response times
- Error rates

## Security

- **IAM Roles**: Least privilege access
- **HTTPS**: SSL/TLS encryption
- **CORS**: Proper cross-origin configuration
- **Input Validation**: Sanitized user inputs

## Deployment

### Infrastructure

```bash
cd backend/terraform
terraform init
terraform plan
terraform apply
```

### Frontend

```bash
cd frontend
yarn build
# Deploy dist/ folder to S3
```

## 📈 Performance Optimizations

- **CloudFront**: Global CDN for fast content delivery
- **Lambda**: Serverless scaling
- **DynamoDB**: NoSQL for fast queries
- **Minification**: Optimized assets

## Development

### Local Development

1. Frontend: `yarn dev`
2. Backend: Test Lambda function locally
3. Database: Use DynamoDB Local

### CI/CD

- Automated testing
- Infrastructure validation
- Deployment pipelines

## 📝 API Documentation

### Endpoints

- `GET /visitor` - Returns visitor count

### Response Format

```json
{
  "visitor_count": 123
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Aashaya Aryal**

- Email: ash@karuifeather.com
- GitHub: [@karuifeather](https://github.com/karuifeather)

## Acknowledgments

- [Cloud Resume Challenge](https://cloudresumechallenge.dev) for the inspiration
- AWS for the serverless platform
- Tailwind CSS for the styling framework
- Vite for the build tooling

---

**Note**: This project demonstrates full-stack cloud development skills and follows AWS best practices for serverless architecture.
