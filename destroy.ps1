# ─────────────────────────────────────────────────────────────────────────────
# destroy.ps1  —  Tears down ALL AWS resources to avoid charges
# Run from repo root:  .\destroy.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$Region  = "us-east-1"
$TfDir   = "terraform\environments\dev"

Write-Host "`nWARNING: This will delete all AWS resources for job-tracker-dev." -ForegroundColor Red
Write-Host "This cannot be undone. Make sure you have taken your screenshots!" -ForegroundColor Red
$confirm = Read-Host "Type 'destroy' to confirm"
if ($confirm -ne "destroy") { Write-Host "Aborted."; exit 0 }

# Empty ECR repo first (Terraform can't delete a non-empty ECR repo)
Write-Host "`nEmptying ECR repository..." -ForegroundColor Cyan
$AccountId = aws sts get-caller-identity --query Account --output text
$RepoName  = "job-tracker-dev"
$Images    = aws ecr list-images --repository-name $RepoName --region $Region --query "imageIds" --output json 2>$null | ConvertFrom-Json
if ($Images -and $Images.Count -gt 0) {
    $ImageIds = $Images | ConvertTo-Json -Compress
    aws ecr batch-delete-image --repository-name $RepoName --region $Region --image-ids $ImageIds | Out-Null
    Write-Host "ECR images deleted" -ForegroundColor Green
}

# Terraform destroy
Write-Host "`nRunning terraform destroy..." -ForegroundColor Cyan
Push-Location $TfDir
terraform destroy -auto-approve
Pop-Location

# Delete S3 backend bucket
Write-Host "`nDeleting Terraform state bucket..." -ForegroundColor Cyan
$BucketName = "job-tracker-tfstate-$AccountId"
aws s3 rb "s3://$BucketName" --force
aws dynamodb delete-table --table-name job-tracker-tf-lock --region $Region | Out-Null

Write-Host "`nAll resources destroyed. You will not be charged." -ForegroundColor Green
