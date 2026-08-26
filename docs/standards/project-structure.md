# Project structure

This repository owns exactly one product and one business. Product code,
evidence, design decisions, assets, deployment configuration, and project
instructions stay together; other customer projects are never copied in as
examples.

The root `AGENTS.md` is the instruction source of truth and `README.md` is the
product record. `docs/standards/` holds this project's own standards — nothing
here is synchronised from another repository, so change it by editing it in a
reviewed pull request. Product documentation may use any clear project-local
structure.

Dependency directories, caches, generated builds, local tooling state, private
exports, and deployment credentials are not versioned unless a project document
explicitly identifies a generated artifact as a deliverable and explains why.
