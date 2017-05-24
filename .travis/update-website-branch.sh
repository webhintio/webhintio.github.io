#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

remove_unneeded_files() {
    find . \
        -maxdepth 1 \
        ! -name "." \
        ! -name "dist" \
        ! -name "node_modules" \
        ! -name "package.json" \
        ! -name "src" \
        ! -name "web.config" \
        -exec rm -rf {} +;
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Automatically update the content from the `website` branch.
#
# Note: The SSH key is stored on Travis CI, but will need to be
#       added once the project is open sourced.
#
#       https://docs.travis-ci.com/user/private-dependencies/

remove_unneeded_files \
    && "$(npm bin)/update-branch" --commands "echo" \
                                  --commit-message "Hey server, this content is for you! [skip ci]" \
                                  --distribution-branch "website" \
                                  --source-branch "master"
