# ─────────────────────────────────────────────────────────────────────────────
# deploy.ps1  —  Full AWS deployment script
# Run from repo root:  .\deploy.ps1
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Terraform >= 1.5 installed
#   - Docker Desktop running
#   - Node.js installed (for frontend build)
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$Region     = "us-east-1"
$Project    = "job-tracker"
$Env        = "dev"
$TfDir      = "terraform\environments\dev"

# ── 0. Get AWS account ID ─────────────────────────────────────────────────────
Write-Host "`n[0/6] Getting AWS account ID..." -ForegroundColor Cyan
$AccountId = aws sts get-caller-identity --query Account --output text
if (-not $AccountId) { Write-Error "AWS CLI not configured. Run: aws configure"; exit 1 }
Write-Host "Account ID: $AccountId" -ForegroundColor Green

# ── 1. Create S3 backend bucket + DynamoDB lock table (idempotent) ────────────
Write-Host "`n[1/6] Creating Terraform backend resources..." -ForegroundColor Cyan
$BucketName = "job-tracker-tfstate-$AccountId"

aws s3api head-bucket --bucket $BucketName 2>$null
if ($LASTEXITCODE -ne 0) {
    aws s3 mb "s3://$BucketName" --region $Region
    aws s3api put-bucket-versioning --bucket $BucketName --versioning-configuration Status=Enabled
    Write-Host "Created S3 bucket: $BucketName" -ForegroundColor Green
} else {
    Write-Host "S3 bucket already exists: $BucketName" -ForegroundColor Yellow
}

aws dynamodb describe-table --table-name job-tracker-tf-lock --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
    aws dynamodb create-table `
        --table-name job-tracker-tf-lock `
        --attribute-definitions AttributeName=LockID,AttributeType=S `
        --key-schema AttributeName=LockID,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region $Region | Out-Null
    Write-Host "Created DynamoDB lock table" -ForegroundColor Green
} else {
    Write-Host "DynamoDB lock table already exists" -ForegroundColor Yellow
}

# Update backend.tf with real account ID
(Get-Content "$TfDir\backend.tf") -replace "YOUR_ACCOUNT_ID", $AccountId |
    Set-Content "$TfDir\backend.tf"
Write-Host "Updated backend.tf with account ID" -ForegroundColor Green

# ── 2. Terraform init + apply ─────────────────────────────────────────────────
Write-Host "`n[2/6] Running terraform init..." -ForegroundColor Cyan
Push-Location $TfDir
terraform init -reconfigure
Write-Host "`n[2/6] Running terraform apply (ECR only first)..." -ForegroundColor Cyan
terraform apply -target=module.ecr -auto-approve
$EcrUrl = terraform output -raw ecr_repository_url
Write-Host "ECR URL: $EcrUrl" -ForegroundColor Green
Pop-Location

# ── 3. Build + push Docker image to ECR ──────────────────────────────────────
Write-Host "`n[3/6] Building and pushing Docker image..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region |
    docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"

docker build -t "$EcrUrl`:latest" .\backend
docker push "$EcrUrl`:latest"
Write-Host "Image pushed to ECR" -ForegroundColor Green

# ── 4. Build React frontend ───────────────────────────────────────────────────
Write-Host "`n[4/6] Building React frontend..." -ForegroundColor Cyan
Push-Location frontend
npm ci
npm run build
Pop-Location
Write-Host "Frontend built" -ForegroundColor Green

# ── 5. Apply full Terraform stack ─────────────────────────────────────────────
Write-Host "`n[5/6] Applying full Terraform stack..." -ForegroundColor Cyan
Push-Location $TfDir
terraform apply -auto-approve
Write-Host "`nOutputs:" -ForegroundColor Cyan
terraform output
Pop-Location

# ── 6. Done ───────────────────────────────────────────────────────────────────
Write-Host "`n[6/6] DONE!" -ForegroundColor Green
Write-Host "Your app is live. Take screenshots of the AWS Console now." -ForegroundColor Yellow
Write-Host "When finished, run:  .\destroy.ps1  to tear everything down." -ForegroundColor Yellow
