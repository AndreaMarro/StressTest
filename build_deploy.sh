#!/bin/bash
# Install root dependencies (frontend)
npm install

# Build frontend
npm run build

# Install server dependencies
cd server
npm install
