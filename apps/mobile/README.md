# @saddahaq/mobile

React Native (CLI, new architecture, Hermes) app. See the root `README.md` for setup.

This app lives in an npm-workspaces monorepo: dependencies are hoisted to the
repo-root `node_modules`, so `android/settings.gradle` and `android/app/build.gradle`
point at `../../../node_modules` / `../../../../node_modules`, and `metro.config.js`
watches the repo root so `@saddahaq/shared` is compiled from source.
