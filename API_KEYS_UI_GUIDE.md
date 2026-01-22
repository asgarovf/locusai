# API Keys Management UI - Implementation Guide

## Overview

This implementation provides a complete user interface for managing API keys in the Locus dashboard. Users can create, view, and delete API keys for CLI authentication and external integrations.

## Architecture

### Components

#### 1. **ApiKeysSettings.tsx** (Container/Smart Component)
Main component that orchestrates the API keys management flow.

**Features:**
- Fetches and manages API keys state
- Handles creation, deletion, and display logic
- Integrates with authentication hooks
- Mock implementation ready for real API integration

**Usage:**
```tsx
import { ApiKeysSettings } from "@/components/settings";

export default function SettingsPage() {
  return <ApiKeysSettings />;
}
```

#### 2. **ApiKeysList.tsx** (Presentational Component)
Displays list of API keys with actions.

**Features:**
- Show/hide toggle for API key values
- Copy-to-clipboard functionality
- Delete action with confirmation
- Date formatting and last-used tracking
- Empty state handling

**Props:**
```typescript
interface ApiKeysListProps {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}
```

#### 3. **CreateApiKeyModal.tsx** (Form Modal)
Modal for creating new API keys.

**Features:**
- Simple name input
- Validation
- Loading state
- Enter key submission

**Props:**
```typescript
interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading?: boolean;
}
```

#### 4. **ApiKeyConfirmationModal.tsx** (Display Modal)
Shows newly created API key (only visible time).

**Features:**
- Display full API key
- Copy button
- Security warning
- One-time display

**Props:**
```typescript
interface ApiKeyConfirmationModalProps {
  isOpen: boolean;
  apiKey: string | null;
  keyName: string;
  onClose: () => void;
}
```

## Integration in Settings Page

The components are integrated into `/apps/web/src/app/(dashboard)/settings/page.tsx`:

```tsx
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";

export default function SettingsPage() {
  return (
    <PageLayout title="Settings">
      <div className="max-w-3xl space-y-8">
        {/* Organization Section */}
        <SettingSection title="Organization">
          {/* ... */}
        </SettingSection>

        {/* API Keys Section */}
        <ApiKeysSettings />

        {/* Danger Zone */}
        {/* ... */}
      </div>
    </PageLayout>
  );
}
```

## UI Flow

### 1. **Initial State**
- Empty API keys list with "Create your first API key" message
- "New Key" button in header

### 2. **Create Flow**
- Click "New Key" → CreateApiKeyModal opens
- Enter name → Click "Create Key"
- Success → ApiKeyConfirmationModal shows with key
- User copies key (only chance to see it)
- Click "Done" → Modal closes, key added to list

### 3. **View/Manage**
- List shows all keys with:
  - Name and active status
  - Masked key value (first 4 + last 4 chars)
  - Eye icon to reveal full key
  - Copy button to clipboard
  - Created date
  - Last used date
  - Delete button

### 4. **Delete Flow**
- Click trash icon on key
- Confirm deletion (handles async)
- Key removed from list
- Toast notification

## API Integration Points

Currently mocked, ready for real implementation:

```typescript
// TODO: Replace in ApiKeysSettings.tsx

// Get all API keys
const keys = await locusClient.organizations.getApiKeys(orgId);

// Create new API key
const response = await locusClient.organizations.createApiKey(orgId, { name });
const newKey = response.key; // Only returned on creation

// Delete API key
await locusClient.organizations.deleteApiKey(orgId, id);
```

## Design System

### Components Used
- **Button** - Primary, secondary, ghost, and danger variants
- **Modal** - Dialog wrapper
- **Input** - Text input field
- **Badge** - Status indicators
- **Icons** - lucide-react

### Styling
- Follows existing settings page design
- Dark mode support via Tailwind classes
- Consistent with TeamMembersList component
- Responsive design

### Key Colors
- Primary/Success: Active status
- Secondary: Inactive status
- Destructive: Delete actions
- Muted: Placeholder text

## Security Considerations

1. **Key Display**
   - Keys are masked by default
   - Full key only visible on creation
   - Can be revealed on demand (UI toggle)

2. **Key Storage**
   - Keys shown in confirmation modal
   - Copy-to-clipboard for safe handling
   - Warning about security in confirmation modal

3. **Deletion**
   - Immediate effect (no confirm dialog required)
   - Can be toggled active/inactive via API

## Testing Checklist

- [ ] Create API key (mock generates key)
- [ ] Verify key appears in list
- [ ] Toggle key visibility
- [ ] Copy key to clipboard
- [ ] Delete key from list
- [ ] Empty state shows when no keys
- [ ] Verify responsive design on mobile
- [ ] Test with dark mode

## Next Steps

1. **Backend Implementation**
   - Create API endpoint: `POST /organizations/{id}/api-keys`
   - Create API endpoint: `GET /organizations/{id}/api-keys`
   - Create API endpoint: `DELETE /organizations/{id}/api-keys/{keyId}`

2. **SDK Integration**
   - Add methods to organizations module:
     ```typescript
     createApiKey(orgId: string, name: string)
     getApiKeys(orgId: string)
     deleteApiKey(orgId: string, keyId: string)
     ```

3. **Real Implementation**
   - Replace mock calls with actual API calls
   - Remove TODO comments

## File Locations

```
apps/web/src/components/settings/
├── ApiKeysSettings.tsx          (Container)
├── ApiKeysList.tsx              (List display)
├── ApiKeyCreatedModal.tsx        (Create form)
├── ApiKeyConfirmationModal.tsx   (Show key modal)
└── index.ts                     (Exports)

apps/web/src/app/(dashboard)/settings/
└── page.tsx                     (Integration point)
```

## Component Exports

All components are exported from `@/components/settings`:

```typescript
export { ApiKeysSettings };
export { ApiKeysList };
export { CreateApiKeyModal };
export { ApiKeyConfirmationModal };
```
