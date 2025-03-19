#!/bin/sh
set -e

echo "Running database setup..."
yarn db:setup

echo "Starting Next.js application..."
yarn start
