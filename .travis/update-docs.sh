#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Rebuild documentation and commit the changes to the `master` branch.
#
# Note: The SSH key is stored on Travis CI, but will need to be
#       added once the project is open sourced.
#
#       https://docs.travis-ci.com/user/private-dependencies/

"$(npm bin)/commit-changes" --branch "master" \
                            --commands "npm run rebuild-docs" \
                            --commit-message "Update documentation [skip ci]"
