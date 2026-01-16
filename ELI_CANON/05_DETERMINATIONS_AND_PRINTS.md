# Determinations and Printouts

A Determination is a signed evaluation of procedural admissibility.

A Printout is an immutable judgment record derived from a Determination.

Once issued:
- Determinations and Printouts cannot be modified
- DELETE, PATCH, and PUT operations are forbidden
- attempts to mutate must return HTTP 403

All artifacts must include:
- deterministic state hash (SHA-256)
- cryptographic signature (Ed25519)
- issuance timestamp

Immutability is absolute.
