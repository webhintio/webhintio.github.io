#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

declare -r TMP_DIR="$(mktemp -d XXXXX)"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

prepare_dist_dir() {

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

prepare_dist_dir \
    && update_website_branch

rm -rf "$TMP_DIR"
