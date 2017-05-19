#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Automatically update the content from the `website` branch.
#
# Note: The SSH key is stored on Travis CI, but will need to be
#       added once the project is open sourced.
#
#       https://docs.travis-ci.com/user/private-dependencies/

"$(npm bin)/update-branch" --commands "npm run build" \
                           --commit-message "Hey server, this content is for you! [skip ci]" \
                           --directory "dist" \
                           --distribution-branch "website" \
                           --source-branch "master"
