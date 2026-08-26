# Testing

This project's real validation commands are `npm ci --prefix website` and
`npm --prefix website run check` for the product, and `npm run preflight` for
the repository safety guard. A check must exercise the implementation;
placeholder commands that always pass are not acceptable.

Before merge, run the repository guard, the project tests, and the production
build. For visual products also record manual checks at the smallest and largest
supported viewports, keyboard focus and navigation, reduced-motion behavior,
console/network errors, and the critical conversion or interaction path. Test
deployable output rather than relying only on source-file inspection.
