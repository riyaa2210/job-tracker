terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # S3 remote backend — stores Terraform state safely.
  # Before running terraform init, create these manually:
  #
  #   aws s3 mb s3://job-tracker-tfstate-<YOUR_ACCOUNT_ID> --region us-east-1
  #   aws dynamodb create-table --table-name job-tracker-tf-lock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST --region us-east-1
  #
  # Then replace YOUR_ACCOUNT_ID below with your real AWS account ID.
  # Get it with: aws sts get-caller-identity --query Account --output text

  backend "s3" {
    bucket         = "job-tracker-tfstate-YOUR_ACCOUNT_ID"
    key            = "job-tracker/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "job-tracker-tf-lock"
    encrypt        = true
  }
}
