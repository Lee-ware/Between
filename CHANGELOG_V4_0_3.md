# BETWEEN v4.0.3

## Release hardening

- Fixed the v4.0.2 startup failure caused by an undefined `initialScreen`.
- Kept the independent boot recovery guard so startup errors cannot leave the app trapped behind the logo.
- Fixed Majority-mode voting: POST requests now identify the question in the request body, matching the function's validation path.
- Moved the Majority allowlist helper out of `netlify/functions/` so Netlify does not attempt to deploy the data module itself as a separate function.
- Bumped the npm package version to 4.0.3 so repository/package metadata matches the product version.
- Bumped the service-worker cache to `between-v4.0.3`.
