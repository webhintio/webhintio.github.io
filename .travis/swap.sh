# Add the Azue CLI 2.0 source and install
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest
AZ_REPO=$(lsb_release -cs)
echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | \
    sudo tee /etc/apt/sources.list.d/azure-cli.list

curl -L https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

sudo apt-get install apt-transport-https
sudo apt-get update && sudo apt-get install azure-cli

# Use a scoped service principal to access Azure
az login --service-principal -u $AZURE_SERVICE_PRINCIPAL -p $AZURE_SERVICE_PRINCIPAL_PASSWORD --tenant $AZURE_TENANT

# Swap slots, default is production
az webapp deployment slot swap -g sonarwhal -n sonarwhal --slot staging

# Run the DocSearch scraper only is this is a cron job.
# https://docs.travis-ci.com/user/cron-jobs/

if [ "$TRAVIS_EVENT_TYPE" == "cron" ]; then
    npm run travis-docsearch-scraper
fi
