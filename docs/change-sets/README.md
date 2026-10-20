# Change-Sets & Patch Directory

This directory stores reproducible `.patch` files representing the exact code and configuration changes introduced in each development phase.

## Policy
- Every phase produces an exact unified diff/patch file (e.g. `01-project-setup.patch`).
- Patches capture both modified files and newly created files.
- Secrets, passwords, `node_modules/`, and temporary build artifacts are strictly excluded.
- Patches allow any developer or interviewer to inspect or replay the exact incremental development progression step-by-step.
