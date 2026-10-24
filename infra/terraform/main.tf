terraform { required_version = ">= 1.7.0" }
# Phase 0 intentionally defines infrastructure as code without credentials.
# Add region-specific RDS PostgreSQL, ElastiCache, ECS, S3 and CloudFront modules per tenant residency plan.
