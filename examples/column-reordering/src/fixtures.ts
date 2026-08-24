export const deploymentRows = [
  {
    Id: 1,
    Service: "checkout-api",
    Environment: { Name: "production", Region: "us-east-1" },
    Status: "healthy",
    Cost: 1240.5,
  },
  {
    Id: 2,
    Service: "billing-worker",
    Environment: { Name: "production", Region: "eu-west-1" },
    Status: "degraded",
    Cost: 860.2,
  },
  {
    Id: 3,
    Service: "search-index",
    Environment: { Name: "staging", Region: "us-east-1" },
    Status: "healthy",
    Cost: 92.75,
  },
  {
    Id: 4,
    Service: "notifications",
    Environment: { Name: "production", Region: "us-west-2" },
    Status: "down",
    Cost: 305.4,
  },
  {
    Id: 5,
    Service: "analytics-pipeline",
    Environment: { Name: "staging", Region: "eu-west-1" },
    Status: "healthy",
    Cost: 145.0,
  },
] as const;

export type DeploymentRow = (typeof deploymentRows)[number];
