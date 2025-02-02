output "api_invoke_url" {
  value = "${aws_api_gateway_deployment.visitor_deployment.invoke_url}"
  description = "URL to invoke the visitor counter API"
}
