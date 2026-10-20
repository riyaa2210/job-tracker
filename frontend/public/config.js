// This file is intentionally left without a hardcoded URL.
// - On Vercel: VITE_API_URL env var is baked in at build time via api.js
// - On AWS ECS: Terraform overwrites this file with the real ALB URL at deploy time
// Do NOT set window.__API_URL__ here — it would override the build-time env var.
