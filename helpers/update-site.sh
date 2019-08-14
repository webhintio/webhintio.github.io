#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

prepare_site_dist_dir() {

    # Remove unnecesary files for the server
    declare -r unnecessaries=(
            src/content-replaced
            src/webhint-theme
        )

    for unnecessary in "${unnecessaries[@]}"; do
        rm -rf "$unnecessary"
    done

    # Move required files to a temp folder
    declare -r files=(
        _config.yml
        helpers
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

    declare -r masterBranch="refs/heads/master"
    declare slot=""
    declare user=""
    declare password=""
    declare message=""

    if [ "$masterBranch" == "$BRANCH" ]; then
        slot="sonarwhal-staging"
        user=$GIT_USER_NAME
        password=$GIT_PASSWORD
        message="Hey server, this content is for you! ***NO_CI***"
    else
        slot="sonarwhal-scanner-staging"
        user=$GIT_SCANNER_USER
        password=$GIT_SCANNER_PASSWORD
        message="Hey staging server, this content is for you! ***NO_CI***"
    fi


    git config --global user.email "$GIT_USER_EMAIL" \
        && git config --global user.name "$user" \
        && git init \
        && git add -A \
        && git commit --message "$message" \
        && git push --quiet --force --set-upstream "https://$user:$password@$slot.scm.azurewebsites.net:443/sonarwhal.git" master
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

main () {
    declare -r TMP_DIR="$(mktemp -d XXXXX)"

    prepare_site_dist_dir \
        && update_website

    if [ $? -eq 0 ]
    then
        echo "Successfully deployed website"
    else
        echo "Could not deploy site" >&2
    fi

    rm -rf "$TMP_DIR"
}

main "$@" \
    &> >(remove_sensitive_information "$GH_USER_EMAIL" "$GIT_USER_NAME" "$GIT_PASSWORD")
