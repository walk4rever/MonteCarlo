#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

git pull

docker build -t montecarlo:latest .

if docker ps -a --format '{{.Names}}' | grep -q '^montecarlo$'; then
  docker rm -f montecarlo
fi

docker run -d --name montecarlo -p 5001:5001 --restart=always montecarlo:latest
