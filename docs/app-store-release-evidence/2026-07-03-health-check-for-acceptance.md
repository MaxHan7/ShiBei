
> recallo@0.1.0 check:app-store-health
> node tools/app-store-production-health-audit.mjs

# Recallo App Store Production Health Audit
mode=strict
url=https://shibei-production.up.railway.app/api/health
httpStatus=200
contentType=application/json; charset=utf-8
ok=true
service=recallo-api
nodeEnv=production
railwayEnvironment=production
railwayDeploymentId=51ae3233-4431-471e-9194-a80b5b09a900
storage=postgres
databaseOk=true
queueQueued=0
queueRunning=0
queueFailed=0
apnsConfigured=true
apnsEnvironment=production
recommendedCatalogArticleCount=9
recommendedCatalogFilters=全部,AI,产品,学习,商业

Production health: READY
