# Deployment

Deployment configuration belongs to this repository; credentials belong to the
hosting platform's environment-scoped secret store. No customer domain, account
identifier, Worker ID, private key, or production token is committed here.

Production changes require explicit authorization, green checks for the exact
commit, a recorded target and expected revision, post-deploy verification, and
a rollback point. Pull requests use isolated previews where the platform
supports them. Exactly one repository may be connected to deploy a given target.
