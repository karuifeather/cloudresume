output "api_invoke_url" {
  value = "${aws_api_gateway_deployment.visitor_deployment.invoke_url}"
  description = "URL to invoke the visitor counter API"
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.api_distribution.domain_name}"
  description = "CloudFront distribution URL for the API"
}
