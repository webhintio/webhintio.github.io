#!/bin/bash

echo "Connecting to Azure"

# Use a scoped service principal to access Azure
az login --service-principal -u $AZURE_SERVICE_PRINCIPAL -p $AZURE_SERVICE_PRINCIPAL_PASSWORD --tenant $AZURE_TENANT

echo "Swapping"

# Swap slots, default is production
az webapp deployment slot swap -g sonarwhal -n sonarwhal --slot staging
