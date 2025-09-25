########################################
# AWS Provider & DynamoDB
########################################
provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "visitor_counter" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}

########################################
# IAM Role & Policies
########################################
resource "aws_iam_role" "lambda_role" {
  name = "visitor-counter-lambda-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "dynamodb_policy" {
  name   = "visitor-counter-dynamodb-policy"
  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action   = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:PutItem"
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.visitor_counter.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_policy_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

########################################
# Lambda Function
########################################
resource "aws_lambda_function" "visitor_counter" {
  filename         = "../lambda_cloudresume/lambda.zip"
  function_name    = var.lambda_function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  source_code_hash = filebase64sha256("../lambda_cloudresume/lambda.zip")
  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.visitor_counter.name
    }
  }
}

########################################
# API Gateway
########################################
resource "aws_api_gateway_rest_api" "visitor_api" {
  name        = var.api_name
  description = "API for visitor counter"
}

resource "aws_api_gateway_resource" "visitor" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id
  parent_id   = aws_api_gateway_rest_api.visitor_api.root_resource_id
  path_part   = "visitor"
}

resource "aws_api_gateway_method" "get_visitor" {
  rest_api_id   = aws_api_gateway_rest_api.visitor_api.id
  resource_id   = aws_api_gateway_resource.visitor.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_visitor_integration" {
  rest_api_id             = aws_api_gateway_rest_api.visitor_api.id
  resource_id             = aws_api_gateway_resource.visitor.id
  http_method             = aws_api_gateway_method.get_visitor.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.visitor_counter.invoke_arn
}

resource "aws_api_gateway_method_response" "get_visitor" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id
  resource_id = aws_api_gateway_resource.visitor.id
  http_method = aws_api_gateway_method.get_visitor.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "get_visitor" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id
  resource_id = aws_api_gateway_resource.visitor.id
  http_method = aws_api_gateway_method.get_visitor.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}


resource "aws_api_gateway_method" "options_visitor" {
  rest_api_id   = aws_api_gateway_rest_api.visitor_api.id
  resource_id   = aws_api_gateway_resource.visitor.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_visitor_integration" {
  rest_api_id             = aws_api_gateway_rest_api.visitor_api.id
  resource_id             = aws_api_gateway_resource.visitor.id
  http_method             = aws_api_gateway_method.options_visitor.http_method
  type                    = "MOCK"
}

resource "aws_api_gateway_method_response" "options_visitor" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id
  resource_id = aws_api_gateway_resource.visitor.id
  http_method = aws_api_gateway_method.options_visitor.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_visitor" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id
  resource_id = aws_api_gateway_resource.visitor.id
  http_method = aws_api_gateway_method.options_visitor.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_deployment" "visitor_deployment" {
  rest_api_id = aws_api_gateway_rest_api.visitor_api.id

  # Explicit dependencies to ensure changes trigger redeployment
  depends_on = [
    aws_api_gateway_method.get_visitor,
    aws_api_gateway_method.options_visitor,
    aws_api_gateway_integration.get_visitor_integration,
    aws_api_gateway_integration.options_visitor_integration,
    aws_api_gateway_method_response.get_visitor,
    aws_api_gateway_method_response.options_visitor,
    aws_api_gateway_integration_response.get_visitor,
    aws_api_gateway_integration_response.options_visitor,
  ]
}

resource "aws_api_gateway_stage" "visitor_stage" {
  rest_api_id   = aws_api_gateway_rest_api.visitor_api.id
  deployment_id = aws_api_gateway_deployment.visitor_deployment.id
  stage_name    = var.api_stage
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.visitor_counter.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.visitor_api.execution_arn}/*/*"
}

########################################
# CloudFront Distribution
########################################
resource "aws_cloudfront_distribution" "api_distribution" {
  origin {
    domain_name = "${aws_api_gateway_rest_api.visitor_api.id}.execute-api.${var.aws_region}.amazonaws.com"
    origin_id   = "api-gateway-origin"
    origin_path = "/${var.api_stage}"
    
    custom_origin_config {
      http_port              = 443
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api-gateway-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["CloudFront-Viewer-Country", "CloudFront-Viewer-Country-Region", "CloudFront-Viewer-Country-Name"]
      
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = var.environment
  }
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}
