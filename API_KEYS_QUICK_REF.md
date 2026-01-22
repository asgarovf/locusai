# 🔑 API Keys UI - Quick Reference

## What Was Built

A complete **API Keys Management UI** in the Locus dashboard settings page for managing CLI authentication.

## Components Created

| Component | Purpose | Location |
|-----------|---------|----------|
| `ApiKeysSettings` | Main container + logic | `components/settings/ApiKeysSettings.tsx` |
| `ApiKeysList` | Display & manage keys | `components/settings/ApiKeysList.tsx` |
| `CreateApiKeyModal` | Create new key form | `components/settings/ApiKeyCreatedModal.tsx` |
| `ApiKeyConfirmationModal` | Show new key once | `components/settings/ApiKeyConfirmationModal.tsx` |

## Quick Start

### View in Dashboard
1. Navigate to **Settings** (left sidebar)
2. Scroll to **🔑 API KEYS** section
3. Click **"New Key"** to create one

### Create API Key
1. Enter key name (e.g., "Production Agent")
2. Click "Create Key"
3. **Copy the key** (only time you'll see it!)
4. Use it with CLI:
   ```bash
   export LOCUS_API_KEY=sk_org_your_key_here
   locus run --workspace ws-123
   ```

### Manage Keys
- **👁 Toggle** - Show/hide key value
- **📋 Copy** - Copy to clipboard
- **🗑️ Delete** - Remove key immediately

## File Structure

```
apps/web/src/components/settings/
├── ApiKeysSettings.tsx              # 🎯 Main component
├── ApiKeysList.tsx                  # 📋 List & actions
├── ApiKeyCreatedModal.tsx           # ✍️  Create form
├── ApiKeyConfirmationModal.tsx       # ✅ Show new key
└── index.ts                         # 📤 Exports (updated)

apps/web/src/app/(dashboard)/settings/
└── page.tsx                         # 🔗 Integration (updated)
```

## Features

✅ Create API keys with custom names  
✅ View all keys with metadata  
✅ Show/hide key values  
✅ Copy to clipboard  
✅ Delete keys  
✅ Last-used tracking  
✅ Empty state  
✅ Loading states  
✅ Error handling  
✅ Toast notifications  
✅ Responsive design  
✅ Dark mode support  

## Current Implementation

**Status**: Mock data ready, real API integration pending

The UI is fully functional with mock API calls:
- Creates mock keys (format: `sk_org_[random]`)
- Displays in list
- Allows copy, show/hide, delete

## Todo: Backend Integration

```typescript
// In locusClient.organizations module, add:

async createApiKey(orgId: string, name: string) {
  return axios.post(`/organizations/${orgId}/api-keys`, { name });
}

async getApiKeys(orgId: string) {
  return axios.get(`/organizations/${orgId}/api-keys`);
}

async deleteApiKey(orgId: string, keyId: string) {
  return axios.delete(`/organizations/${orgId}/api-keys/${keyId}`);
}
```

Then uncomment TODOs in `ApiKeysSettings.tsx`:

```typescript
// Line 65: Fetch keys
const keys = await locusClient.organizations.getApiKeys(orgId);
setApiKeys(keys);

// Line 81: Create key
const response = await locusClient.organizations.createApiKey(orgId, name);
setNewApiKey(response.key);

// Line 114: Delete key
await locusClient.organizations.deleteApiKey(orgId, id);
```

## Security

🔒 Keys are masked by default (show first 4 + last 4)  
🔒 Full key only visible at creation time  
🔒 Warning about secure storage  
🔒 Copy-to-clipboard for safe handling  

## Testing

Navigate to Settings → API KEYS section to test:

```bash
# Try these actions:
1. Click "New Key"
2. Enter "Test Key" as name
3. Click "Create Key"
4. See confirmation modal with generated key
5. Click "Copy" button (should show toast)
6. Click "Done" - key appears in list
7. Try eye icon to show/hide
8. Try copy icon again
9. Try delete icon
```

## Integration with CLI

Once backend is ready:

```bash
# User gets key from dashboard and uses with CLI
locus run \
  --api-key sk_org_abc123... \
  --workspace ws-123 \
  --api-url https://api.locus.dev
```

## Documentation

📖 See detailed docs:
- `API_KEYS_UI_GUIDE.md` - Full architecture & implementation
- `API_KEYS_UI_SUMMARY.md` - Visual flows & component overview

## Testing Checklist

- [x] All components created
- [x] Linting passes (0 errors)
- [x] Integrated into settings page
- [x] Mock data working
- [x] UI responsive
- [x] Dark mode compatible
- [ ] Backend API endpoints created
- [ ] Real API integration enabled
- [ ] E2E testing with CLI

---

**Status**: ✅ Frontend ready for backend integration
