#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r SSH_FILE="$(mktemp "$HOME/.ssh/XXXXX")"
declare -r TMP_DIR="$(mktemp -d /tmp/XXXXX)"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Decrypt the file containing the private key for the main repository.

openssl aes-256-cbc \
    -K  "$encrypted_1b2b8f95b98b_key" \
    -iv "$encrypted_1b2b8f95b98b_iv" \
    -in .travis/github-clone-key.enc \
    -out "$SSH_FILE" -d \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Enable SSH authentication.

chmod 600 "$SSH_FILE" \
    && printf "%s\n" \
        "Host github.com-sonar" \
        "  HostName github.com" \
        "  IdentitiesOnly yes" \
        "  IdentityFile $SSH_FILE" \
        "  LogLevel ERROR" >> "$HOME/.ssh/config" \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Fetch documentation.

git clone git@github.com-sonar:MicrosoftEdge/Sonar.git "$TMP_DIR" \
    && rm -rf source/docs \
    && cp -R "$TMP_DIR/docs" source
