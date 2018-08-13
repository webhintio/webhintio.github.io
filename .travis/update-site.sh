#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

prepare_site_dist_dir() {

    declare -r files=(
        _config.yml
        dist
        package.json
        src
        web.config
    )

    for file in "${files[@]}"; do
        cp -R "$file" "$TMP_DIR"
    done
}

update_website() {
    # Move to temp folder
    cd "$TMP_DIR"

    git config --global user.email "$GIT_USER_EMAIL" \
        && git config --global user.name "$GIT_USER_NAME" \
        && git init \
        && git add -A \
        && git commit --message "Hey server, this content is for you! [skip ci]" \
        && git push --quiet --force --set-upstream "https://$GIT_USER_NAME:$GIT_PASSWORD@sonarwhal-staging.scm.azurewebsites.net:443/sonarwhal.git" master
}

remove_sensitive_information() {

    declare -r CENSOR_TEXT="[secure]";

    while IFS="" read -r line; do

        for text in "$@"; do
            line="${line//${text}/$CENSOR_TEXT}"
        done

        printf "%s\n" "$line"

    done

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

main () {
    declare -r TMP_DIR="$(mktemp -d XXXXX)"

    prepare_site_dist_dir \
        && update_website

    rm -rf "$TMP_DIR"
}

main "$@" \
    &> >(remove_sensitive_information "$GH_USER_EMAIL" "$GIT_USER_NAME" "$GIT_PASSWORD")
