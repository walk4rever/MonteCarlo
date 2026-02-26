#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

git pull

docker build --network host -t montecarlo:latest .

if docker ps -a --format '{{.Names}}' | grep -q '^montecarlo$'; then
  docker rm -f montecarlo
fi

docker run -d --name montecarlo --network host --restart=always montecarlo:latest
