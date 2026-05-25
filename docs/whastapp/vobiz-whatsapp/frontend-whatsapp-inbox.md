# Frontend Guide: WhatsApp Inbox Memory

## Purpose

The WhatsApp inbox now reads Monade's Redis memory layer, not Vobiz conversation history.

Each thread is keyed by:

```text
user_uid + waba_id + customer_phone
```

This gives us cleaner bot context, strict user/channel separation, fast dashboard reads, and a clear-chat action for testing or support.

## List Threads

Public ingress path:

```http
GET /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads
GET /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads?connection_id=:connection_id
GET /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads?waba_id=:waba_id
GET /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads?q=9198&limit=50&offset=0
```

Config-server internal route after ingress rewrite is the same path without `/db_services`.

Use this for the inbox sidebar/table.

When calling thread-specific routes, URL-encode the returned `thread_id` with `encodeURIComponent(thread_id)` because it contains `:` and `+`.

Response:

```json
{
  "threads": [
    {
      "thread_id": "user-id:1345061194213831:+919876543210",
      "user_uid": "user-id",
      "waba_id": "1345061194213831",
      "channel_id": "vobiz-channel-id",
      "whatsapp_channel_connection_id": "local-channel-id",
      "phone": "+919876543210",
      "last_message_at": "2026-05-24T10:30:00.000Z",
      "last_direction": "inbound",
      "last_sender": "user",
      "last_status": "received",
      "last_text": "I am interested",
      "channel": {}
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

`waba_id` is the account-level grouping key for the inbox. `channel_id` is still returned as provider metadata because Vobiz send/template APIs need it, but it is not used as the Redis thread partition.

## Read Messages

```http
GET /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads/:thread_id/messages?limit=100&offset=0
```

Messages are chronological within the returned page.

Common fields:

```json
{
  "id": "message-id",
  "thread_id": "user-id:1345061194213831:+919876543210",
  "user_uid": "user-id",
  "waba_id": "1345061194213831",
  "channel_id": "vobiz-channel-id",
  "direction": "inbound",
  "sender": "user",
  "text": "I am interested",
  "message_type": "text",
  "status": "received",
  "provider_message_id": "...",
  "meta_message_id": "...",
  "conversation_id": "...",
  "created_at": "2026-05-24T10:30:00.000Z"
}
```

Sender values:

- `user`: customer inbound message
- `bot`: Monade WhatsApp bot reply
- `template`: outbound template follow-up
- `status`: delivery/read/reply status event

## Clear A Thread

Clear by thread id:

```http
DELETE /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/threads/:thread_id
```

Clear by selected channel and phone:

```http
DELETE /db_services/api/users/:user_uid/vobiz-whatsapp/inbox/channels/:connection_id/phones/:phone
```

Use this for a development/support "Reset chat context" action.

## Bot Context

The WhatsApp bot now reads recent messages from this Redis memory layer before calling Gemini.

Current bot LLM context window:

```text
latest 4 WhatsApp messages from the same user + WABA + phone thread
```

Redis stores more than that for inbox/history:

```text
up to 250 messages per thread, TTL 30 days
```

Clearing a thread deletes the Redis messages and metadata immediately. If the customer messages again later, the webhook recreates a fresh thread. Expired thread pointers are also pruned from the user's Redis index while listing threads.
