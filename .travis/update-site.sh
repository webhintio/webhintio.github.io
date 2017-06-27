#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

prepare_site_dist_dir() {

    declare -r files=(
        dist
        package.json
        src
        web.config
    )

    for file in "${files[@]}"; do
        cp -R "$file" "$TMP_DIR"
    done
}

run_docsearch_scraper() {

    # Run the DocSearch scraper only is this is a cron job.
    # https://docs.travis-ci.com/user/cron-jobs/

    if [ "$TRAVIS_EVENT_TYPE" == "cron" ]; then
        npm run travis-docsearch-scraper
    fi

}

set_up_ssh() {
    $(npm bin)/set-up-ssh \
        --key "$encrypted_1b2b8f95b98b_key" \
        --iv  "$encrypted_1b2b8f95b98b_iv" \
        --path-encrypted-key ".travis/github-deploy-key.enc"
}

update_website_branch() {

    # Automatically update the content from the `website` branch.
    #
    # Note: The SSH key is stored on Travis CI, but will need to be
    #       added once the project is open sourced.
    #
    #       https://docs.travis-ci.com/user/private-dependencies/


    "$(npm bin)/update-branch" --commands "echo" \
                               --commit-message "Hey server, this content is for you! [skip ci]" \
                               --directory "$TMP_DIR" \
                               --distribution-branch "website" \
                               --source-branch "master"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Only execute the following if the commit:
#
#   * does not come from a pull request
#   * is made to the `master` branch

if [ "$TRAVIS_PULL_REQUEST" != "false" ] ||
   [ "$TRAVIS_BRANCH" != "master" ]; then
    exit 0
fi


# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r TMP_DIR="$(mktemp -d XXXXX)"

run_docsearch_scraper

set_up_ssh \
    && prepare_site_dist_dir \
    && update_website_branch

rm -rf "$TMP_DIR"
