# Security Specification — Firestore Rules

## 1. Data Invariants
1. **PII Isolation**: `/users/{userId}` documents contain user email addresses and are readable/writable ONLY by `request.auth.uid == userId` or verified Admin. No blanket `list` on `/users`.
2. **Strict Tenant Ownership**: Every `/stores/{storeId}`, `/cost_profiles/{profileId}`, `/scenarios/{scenarioId}`, and `/reports/{reportId}` document requires `ownerId == request.auth.uid` on create, update, read, list, and delete.
3. **Referential Integrity**: Creating a `cost_profile`, `scenario`, or `report` verifies via `exists()` and `get()` that the referenced `storeId` exists and belongs to `request.auth.uid`.
4. **Server-Authoritative Entitlements**: `/purchase_entitlements/{entitlementId}` is read-only for the owning user (`resource.data.userId == request.auth.uid`). Clients can NEVER create, update, or delete entitlements.
5. **Privilege Separation**: `/users/{userId}` has no role/admin field. Only `/admins/{userId}` and verified bootstrap admin email (`sarinasel90@gmail.com` with `email_verified == true`) grant admin access to `/admin_settings`.
6. **Immutable Provenance & Server Timestamps**: `ownerId`/`userId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.

## 2. Adversarial "Dirty Dozen" Test Payloads
1. **Cross-User Scenario Read**: User B attempts `get(/scenarios/userA_scenario)` -> `PERMISSION_DENIED`.
2. **Cross-User Query Enumeration**: User B runs `list(/scenarios)` without `where('ownerId', '==', userB)` -> `PERMISSION_DENIED`.
3. **Client Pro Self-Unlock**: User A attempts `create(/purchase_entitlements/fake_order)` with `{ status: 'active', userId: userA }` -> `PERMISSION_DENIED`.
4. **Entitlement Tampering**: User A attempts `update(/purchase_entitlements/order1, { status: 'active' })` -> `PERMISSION_DENIED`.
5. **Owner Spoofing on Create**: User A attempts `create(/scenarios/s1, { ownerId: 'userB', ... })` -> `PERMISSION_DENIED`.
6. **Owner Hijack on Update**: User A attempts `update(/scenarios/s1, { ownerId: 'userB' })` -> `PERMISSION_DENIED`.
7. **Shadow Ghost Field Injection**: User A attempts `create(/users/userA, { ..., isAdmin: true })` -> `PERMISSION_DENIED` (`hasOnly` rejects extra keys).
8. **Unverified Admin Email Spoof**: User with email `sarinasel90@gmail.com` and `email_verified: false` attempts `update(/admin_settings/global)` -> `PERMISSION_DENIED`.
9. **Orphan Scenario Creation**: User A creates `/scenarios/s1` referencing non-existent or User B's `storeId` -> `PERMISSION_DENIED`.
10. **ID Poisoning / Resource Exhaustion**: User A attempts `create(/scenarios/<2KB_string>)` or sets `title` > 120 chars -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: User A creates `/scenarios/s1` with client-backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
12. **Terminal Deletion Request Tampering**: User A attempts to update `/deletion_requests/req1` status to `'processed'` -> `PERMISSION_DENIED`.
