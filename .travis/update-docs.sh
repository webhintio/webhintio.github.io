#!/bin/bash

# Run the DocSearch scraper only is this is a cron job.
# https://docs.travis-ci.com/user/cron-jobs/

if [ "$TRAVIS_EVENT_TYPE" == "cron" ]; then
    npm run travis-docsearch-scraper
fi
