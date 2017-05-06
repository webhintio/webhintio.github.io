#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Automatically update the content from the `website` branch.

$(npm bin)/set-up-ssh --key "$encrypted_89e93c8b10f7_key" \
                      --iv  "$encrypted_89e93c8b10f7_iv" \
                      --path-encrypted-key ".travis/github-deploy-key.enc" \
    && $(npm bin)/update-branch --commands "npm run build" \
                                --commit-message "Hey server, this content is for you! [skip ci]" \
                                --directory "public" \
                                --distribution-branch "website" \
                                --source-branch "master"
