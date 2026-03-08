# Frontend RAG Integration Guide

## Overview

RAG (Retrieval-Augmented Generation) allows assistants to search through uploaded documents during live calls. Users upload documents to create a **RAG Corpus**, then attach it to an assistant. When the assistant handles a call, it can retrieve relevant information from those documents in real-time.

---

## API Endpoints

All endpoints require `Authorization: Bearer <api_key>` header.

Base URL: `{{base_url}}/db_services`

### RAG Corpus CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rag-corpora` | Create corpus + upload first file |
| `POST` | `/api/rag-corpora/:id/files` | Add more files to existing corpus |
| `GET` | `/api/rag-corpora/user/:user_uid` | List all corpora for a user |
| `GET` | `/api/rag-corpora/:id` | Get corpus details |
| `DELETE` | `/api/rag-corpora/:id` | Delete corpus (auto-detaches from assistants) |

### Attach/Detach RAG to Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/assistants/:id/attach-rag` | Attach a corpus (one-click) |
| `PATCH` | `/api/assistants/:id/detach-rag` | Detach corpus (no body needed) |

### Advanced (Power Users Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assistants/:id/tools-config` | Read raw toolsConfig JSON |
| `PATCH` | `/api/assistants/:id/tools-config` | Write raw toolsConfig JSON |
| `PATCH` | `/api/assistants/:id/tools-toggle` | Master enable/disable toggle |

---

## User Flow (Simple Path)

### Step 1: Create a RAG Corpus

```
POST /api/rag-corpora
{
  "user_uid": "user-uuid-here",
  "name": "Product FAQ",
  "description": "Product documentation and FAQs",
  "file_text": "Your document content here...",
  "filename": "product-faq.txt"
}
```

**Alternative**: Send `file_base64` instead of `file_text` for binary files.

**Response:**
```json
{
  "id": "corpus-db-uuid",
  "user_uid": "user-uuid",
  "name": "Product FAQ",
  "corpusResourceName": "projects/.../ragCorpora/...",
  "fileCount": 1,
  "status": "active",
  "createdAt": "2026-03-08T..."
}
```

Save the `id` — you'll use it to attach to an assistant.

### Step 2: (Optional) Add More Files

```
POST /api/rag-corpora/{corpus_id}/files
{
  "file_text": "More document content...",
  "filename": "additional-docs.txt"
}
```

### Step 3: Attach Corpus to Assistant

This is the key endpoint. **One API call, no complex JSON needed.**

```
PATCH /api/assistants/{assistant_id}/attach-rag
{
  "rag_corpus_id": "corpus-db-uuid"
}
```

**What happens internally:**
- Validates the corpus belongs to the same user as the assistant
- Auto-builds the `toolsConfig` JSON with the correct Vertex AI resource path
- Sets `enableTools = true` on the assistant
- Returns confirmation with the attached corpus details

**Response:**
```json
{
  "id": "assistant-uuid",
  "name": "Customer Support",
  "enableTools": true,
  "toolsConfig": {
    "max_tool_steps": 1,
    "tools": [{
      "type": "vertex_rag",
      "enabled": true,
      "config": {
        "rag_corpus": "projects/.../ragCorpora/...",
        "similarity_top_k": 10,
        "vector_distance_threshold": 0.3
      }
    }]
  },
  "attachedCorpus": {
    "id": "corpus-db-uuid",
    "name": "Product FAQ",
    "corpusResourceName": "projects/.../ragCorpora/..."
  }
}
```

### Step 4: Detach Corpus (if needed)

```
PATCH /api/assistants/{assistant_id}/detach-rag
```

No request body needed. Resets toolsConfig to defaults and disables tools.

---

## Frontend UI Recommendations

### RAG Corpus Page

- **List view**: Show user's corpora from `GET /api/rag-corpora/user/:user_uid`
  - Display: name, description, fileCount, status, createdAt
- **Upload**: Form with name, description, file upload (text or base64)
- **Add files**: Button on each corpus to add more documents
- **Delete**: Confirm dialog — warn that attached assistants will be detached

### Assistant Edit Page

- **RAG Corpus dropdown**: Populated from `GET /api/rag-corpora/user/:user_uid`
  - Show corpus name and file count
  - "None" option to detach
- **On select**: Call `PATCH /api/assistants/:id/attach-rag` with the corpus `id`
- **On "None"**: Call `PATCH /api/assistants/:id/detach-rag`
- **Status indicator**: Show whether RAG is active (check `enableTools` and `toolsConfig`)

### How to Detect Current Attachment

When fetching an assistant, check:
```js
const assistant = await fetchAssistant(id);

const isRagAttached =
  assistant.enableTools === true &&
  assistant.toolsConfig?.tools?.some(
    t => t.type === 'vertex_rag' && t.enabled === true && t.config?.rag_corpus
  );

// To get the corpus resource name (for matching against corpus list):
const attachedCorpusResource = assistant.toolsConfig?.tools
  ?.find(t => t.type === 'vertex_rag' && t.enabled)
  ?.config?.rag_corpus;

// Match it to the user's corpus list to show which one is selected:
const corpora = await listUserCorpora(user_uid);
const selectedCorpus = corpora.find(c => c.corpusResourceName === attachedCorpusResource);
```

---

## Error Handling

| Status | Meaning | Frontend Action |
|--------|---------|----------------|
| `400` | Missing fields or invalid corpus | Show validation error |
| `403` | Corpus doesn't belong to this user | Show "access denied" |
| `404` | Assistant or corpus not found | Show "not found" |
| `502` | Vertex AI error (corpus creation) | Show "try again later" |
| `503` | GCS not configured | Show "storage unavailable" |

---

## Cascade Behavior

- **Deleting a corpus** automatically detaches it from all assistants using it (sets `enableTools=false`, clears `toolsConfig`)
- **Deleting an assistant** has no effect on the corpus — it remains available for other assistants
- **Multiple assistants** can use the same corpus

---

## Authentication

All requests must include one of:
- `Authorization: Bearer <betterauth-api-key>` — for SDK/API users
- Session cookie — for dashboard users (auto-handled by browser)

The auth middleware resolves the user and enforces ownership automatically.
