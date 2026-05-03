# Permissions & Roles

> **Source of truth.** The matrix below is the contract between roles and what
> each role can do, see, and access. Every API route, every UI button, and
> every test reads from `src/lib/enterprise/permissions.ts`. If you change a
> rule here, update that file (and the test suite) in the same PR — they
> must never drift.

---

## Mental model

Reattend Enterprise uses a **role-default + per-user-override** permission
system (the same shape as Slack, Notion, Linear).

- **Roles ship with sensible defaults.** A new user gets a role; the role
  bundles the permissions that role typically needs. 90% of orgs never need
  to touch overrides.
- **Per-user overrides** let an admin grant or revoke a single permission for
  a single user without inventing a new role. Example: a COO who isn't an
  org admin but does need to see the audit log → grant `org.audit.read` to
  that one user, leave their role as `member`.
- **The server is the gate.** Every API route checks `hasPermission(...)`.
  The UI hides buttons the user can't use, but that's defense in depth — the
  server is the source of truth.

---

## Roles

There are two parallel role systems that compose:

### Org-level roles (one per user per org)

| Role | What it means |
|---|---|
| `super_admin` | Org owner. Billing, SSO, can promote/demote any other role including other super_admins. |
| `admin` | Operational lead. Can do everything except billing and minting other super_admins. |
| `member` | Default role for any invited user. Can use the product, manage their own records. |
| `guest` | Read-only outsider. Useful for auditors, contractors who only need to ask questions. |

### Department-level roles (one per user per department they're in)

| Role | What it means |
|---|---|
| `dept_head` | Owns the department. All dept-scoped management actions. |
| `manager` | Operational lead inside the department. Can manage records, agents, decisions in that dept. |
| `member` | Default for anyone added to a dept. Read + write records they're allowed to. |
| `viewer` | Read-only inside the dept. |

Org-level `super_admin` / `admin` automatically pass any dept-scoped check
inside their org. They don't need to be added to every dept.

---

## Permission matrix

Legend:
- ✓ = always granted
- "own dept" = granted for resources in a department the user is `dept_head` or `manager` of (and its descendants in the dept tree)
- "own records" = granted for resources the user created
- — = not granted

| Permission | super_admin | admin | dept_head | manager | member | guest |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `org.manage` (settings, billing, SSO) | ✓ | — | — | — | — | — |
| `org.members.manage` (org-wide invite/role) | ✓ | ✓ | — | — | — | — |
| `org.audit.read` | ✓ | ✓ | own dept | — | — | — |
| `org.departments.manage` | ✓ | ✓ | — | — | — | — |
| `org.read` (basic dashboards) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `policies.manage` | ✓ | ✓ | — | — | — | — |
| `agents.manage` | ✓ | ✓ | own dept | own dept | — | — |
| `decisions.manage` | ✓ | ✓ | own dept | own dept | — | — |
| `records.share.manage` | ✓ | ✓ | own dept | own dept | own records | — |
| `records.visibility.change` | ✓ | ✓ | own dept | own dept | own records | — |
| `records.verify` | ✓ | ✓ | own dept | own dept | own records | — |
| `graph.links.manage` | ✓ | ✓ | own dept | own dept | own records | — |
| `wiki.manage` | ✓ | ✓ | own dept | — | — | — |
| `integrations.manage` | ✓ | ✓ | own dept | — | — | — |
| `analytics.read` | ✓ | ✓ | own dept | — | — | — |
| `compose.use` (email reply, broadcast) | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `calendar.write` | ✓ | ✓ | ✓ | ✓ | ✓ | — |

### Self-actions (no permission required, only org membership)

These are things any active member of the org can do *for themselves*:

- View / dismiss an announcement
- Acknowledge a policy that applies to them
- Brain-dump (write to their own personal memory)
- Submit anonymous-ask
- Accept an invite (token-gated)
- Import their personal Reattend data into the org (one-way, themselves only)
- Log a record view
- Create / edit a personal prompt

Self-actions are NOT in the matrix because they're not bounded by role — every
active member gets them. They ARE bounded by org membership: a user must be
an active member of the org they're acting in.

---

## Permission overrides

Sometimes a customer's org chart doesn't fit the role grid. The classic case:

> Our COO is not an admin (she doesn't manage members or settings) but she
> needs to see the org-wide audit log every week.

Instead of forcing them into `admin`, we grant her one extra permission:

```
GRANT org.audit.read TO user='coo@acme.com' IN org='acme'
```

This is stored in `organization_member_permission_overrides`:

| user_id | permission_key | scope | granted | granted_by | reason |
|---|---|---|---|---|---|
| u_coo | `org.audit.read` | NULL (org-wide) | 1 | u_admin | "Weekly compliance review" |

`scope = NULL` means org-wide. `scope = <department_id>` scopes the grant to one
department. `granted = 0` is a *revoke* (rare — usually you just lower the role).

Overrides are visible on the member's detail page in `/app/admin/[orgId]/members/[userId]`.
Admins can grant/revoke from there. Every change is in the audit log.

---

## How to use this in code

### In an API route

```typescript
import { requireOrgAuth, isAuthResponse } from '@/lib/enterprise'

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const auth = await requireOrgAuth(req, orgId, 'decisions.manage')
  if (isAuthResponse(auth)) return auth
  // ...continue
}
```

For dept-scoped actions, pass the scope:

```typescript
const auth = await requireOrgAuth(req, orgId, 'agents.manage', { departmentId })
```

If the user isn't allowed, you get a `403 { error: 'missing permission: agents.manage' }`.
The handler never sees an unauthorized caller.

### In a React component

```typescript
import { usePermission } from '@/lib/enterprise/use-permission'

function DecisionToolbar({ orgId, departmentId }) {
  const canManage = usePermission(orgId, 'decisions.manage', { departmentId })
  if (!canManage) return null
  return <Button>New decision</Button>
}
```

The hook reads from a session-scoped permission cache that's refreshed on
login + role change. It is NOT the source of truth — the server still
re-checks. The hook only hides UI to avoid showing buttons that 403.

---

## Adding a new permission

1. Add the key to `OrgPermission` union in `src/lib/enterprise/permissions.ts`.
2. Add a row to the role-default map.
3. Update the matrix in this doc.
4. Add a test in `src/__tests__/rbac/permissions.test.ts` for each role.
5. Wire it into the relevant route(s).

If the permission needs dept scoping, also add it to the dept-aware checks
inside `hasPermission()`.

---

## When in doubt

- "Can the user do X?" → check this matrix, then look at
  `src/lib/enterprise/permissions.ts`.
- "Why did the user get 403?" → server log will print
  `missing permission: <key>` — match it against the matrix.
- "We need a new role" → almost certainly we don't. Use overrides instead.
  New roles fragment the model and confuse customers. The bar for adding
  one is "we sold a contract that explicitly requires it."
