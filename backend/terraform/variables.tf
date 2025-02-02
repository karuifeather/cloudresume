variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for the visitor counter"
  type        = string
  default     = "visitor-counter"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "lambda_function_name" {
  description = "Name for the Lambda function"
  type        = string
  default     = "visitor-counter-lambda"
}

variable "api_name" {
  description = "Name for the API Gateway"
  type        = string
  default     = "visitor-api"
}

variable "api_stage" {
  description = "Stage name for the API deployment"
  type        = string
  default     = "prod"
}
