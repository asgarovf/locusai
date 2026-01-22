# API Keys UI - Component Overview

## Files Created

```
apps/web/src/components/settings/
├── ApiKeysSettings.tsx              ← Main container component
├── ApiKeysList.tsx                  ← List display & actions
├── ApiKeyCreatedModal.tsx           ← Create form modal
├── ApiKeyConfirmationModal.tsx       ← Show new key modal
└── index.ts                         ← Updated exports

apps/web/src/app/(dashboard)/settings/
└── page.tsx                         ← Updated with ApiKeysSettings integration
```

## User Interface Layout

### Settings Page with API Keys Section

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                 │
│ Manage your workspace preferences and configuration.      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⚙️ ORGANIZATION                                          │
├─────────────────────────────────────────────────────────┤
│ 👥 Team                                                 │ ▶
│    Invite and manage organization members               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔑 API KEYS                                              │
├─────────────────────────────────────────────────────────┤
│ 🔑 Manage API Keys                    [New Key Button] │
│    Use API keys for CLI auth & integrations             │
├─────────────────────────────────────────────────────────┤
│ › Production Agent        ✓ Active                       │
│   sk_org_****•••••••••••••••••••••••••****abc3            │
│   [👁] [📋] Created Jan 22, 2026  Last used Never [🗑]  │
├─────────────────────────────────────────────────────────┤
│ › CI Pipeline             ✓ Active                       │
│   sk_org_****•••••••••••••••••••••••••****xyz7            │
│   [👁] [📋] Created Jan 21, 2026  Last used Jan 21 [🗑]  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🚨 DANGER ZONE                                           │
├─────────────────────────────────────────────────────────┤
│ Delete Organization                  [Delete Button]   │
│ Permanently delete this organization and all its data   │
└─────────────────────────────────────────────────────────┘
```

## Flow Diagrams

### 1. Create API Key Flow

```
User clicks "New Key"
        ↓
[Create API Key Modal]
  ┌─────────────────────┐
  │ Key Name: [_______] │
  │ [Cancel] [Create]   │
  └─────────────────────┘
        ↓ (User enters name)
        ↓ (User clicks Create)
        ↓
Mock generates: sk_org_abc123def456...
        ↓
[API Key Confirmation Modal]
  ┌──────────────────────────────────┐
  │ API Key Created                  │
  │ Key Name: Production Agent       │
  │                                  │
  │ ┌──────────────────────────────┐ │
  │ │ sk_org_abc123def456xyz789    │ │
  │ │ [📋 Copy]                    │ │
  │ └──────────────────────────────┘ │
  │                                  │
  │ ⚠️ Save key now. You won't     │
  │    see it again!                 │
  │                                  │
  │ [Done]                           │
  └──────────────────────────────────┘
        ↓ (User copies & clicks Done)
        ↓
Key appears in list
```

### 2. View/Manage Keys Flow

```
[API Keys List]

Each key item shows:
┌────────────────────────────────────────────┐
│ Key Name    ✓ Active                        │
│ sk_org_****••••••••••••••••••****abc3       │
│ [👁 Show] [📋 Copy] Created X  [🗑 Delete]│
└────────────────────────────────────────────┘

Features:
- 👁  Toggle: Reveals/hides full key
- 📋 Copy: Sends key to clipboard (toast: "copied!")
- 🗑  Delete: Removes key immediately (async handled)
- Dates: Created & Last Used timestamps
```

## Key Features

### ✅ Implemented Features

1. **Create API Keys**
   - Modal form with name input
   - Validation (non-empty names)
   - One-time display of full key

2. **View API Keys**
   - List with all keys
   - Name and active status
   - Masked key display (first 4 + last 4)
   - Created and last-used dates

3. **Manage Keys**
   - Show/hide toggle for full key
   - Copy to clipboard
   - Delete with async handling
   - Toast notifications

4. **Security**
   - Keys masked by default
   - Full key only visible on creation
   - Security warning in confirmation modal
   - Copy-safe handling

5. **UX**
   - Empty state messaging
   - Loading states
   - Error handling with toasts
   - Responsive design
   - Dark mode support

## Mock API Responses

The components are fully functional with mock data:

```typescript
// Mock: Create API Key
{
  key: "sk_org_" + random_string(60)
}

// Mock: List API Keys
{
  keys: [
    {
      id: "...",
      name: "Production Agent",
      key: "sk_org_...",
      createdAt: Date,
      lastUsedAt: Date | null,
      active: true
    }
  ]
}

// Mock: Delete API Key
// Returns 200 OK
```

## How to Test

### 1. Navigate to Settings
```
Dashboard → Settings (bottom of sidebar)
```

### 2. Scroll to "API KEYS" Section
```
You'll see:
- 🔑 API Keys
- Manage API Keys with [New Key] button
- (Empty list initially)
```

### 3. Create API Key
```
1. Click [New Key]
2. Enter name: "Test Key"
3. Click [Create Key]
4. See confirmation modal with generated key
5. Click [Copy] to copy key
6. Click [Done]
7. Key appears in list
```

### 4. Test Key Actions
```
1. Click 👁 to show/hide key
2. Click 📋 to copy (toast shows "copied!")
3. Click 🗑 to delete (key removed instantly)
```

## Integration with CLI

Once API endpoints are created, users can:

```bash
# Set API key from dashboard
export LOCUS_API_KEY=sk_org_abc123def456...

# Run CLI with key
locus run --workspace ws-123
```

## Next: Backend Integration

See `API_KEYS_UI_GUIDE.md` for:
- API endpoint specifications
- SDK method signatures
- Real implementation checklist
