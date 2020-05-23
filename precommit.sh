#!/bin/bash

# abort on errors
set -e

check_changes() {
  if git diff --stat --cached -- "$1" | grep -E "$1"; then
    echo "run precommit for $1"
    return 0
  else
    echo "no changes found for $1"
    return 1
  fi
}

node_paths=("api/" "github-app/" "cli/" "web/" "vscode" ".github/build-frontend")

for path in "${node_paths[@]}"
do
  if check_changes "$path"; then
    npm run precommit --prefix $path
  fi
done

if check_changes "antlr/"; then
  cd antlr && ./precommit.sh && cd -
fi

git add -A
