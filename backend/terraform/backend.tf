terraform {
  backend "s3" {
    bucket         = "karuifeather-cloudresume"
    key            = "backend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
