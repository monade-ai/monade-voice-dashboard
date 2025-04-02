# Application Module Tree

## 📁 src/app

### 🔸 assistants/
- **[assistantId]/**
  - layout.tsx
  - page.tsx
- **components/**
  - ai-voice-input.tsx
  - assistant-card.tsx
  - assistant-dual-button.tsx
  - assistant-name-edit.tsx
  - assistant-tabs.tsx
  - assistants-header.tsx
  - audio-visualiser.tsx
  - cost-display.tsx
  - create-assistant-button.tsx
  - phone-dialog.tsx
  - web-assistant-dialog.tsx
  - **tab-views/**
    - model-tab.tsx
- **lib/**
  - rtviClient.ts
  - utils.ts
- **providers/**
  - pipcat-provider.tsx
- delete-confirmation-modal.tsx
- page.tsx

### 🔸 dashboard/
- **components/**
  - bar-chart.tsx
  - dashboard-header.tsx
  - date-range-picker.tsx
  - failed-calls-list.tsx
  - line-chart.tsx
  - metrics-card.tsx
- **data/**
  - mock-data.ts
- page.tsx

### 🔸 hooks/
- use-assistants-context.tsx
- use-dashboard-data.ts
- use-microphone.ts
- use-phone-assistant.ts

### 🔸 workflow/
- **components/**
  - workflow-editor.tsx
- **editors/**
  - action-editor.tsx
  - function-editor.tsx
  - json-editor.tsx
  - message-editor.tsx
- **nodes/**
  - base-node.tsx
  - end-node.tsx
  - flow-node.tsx
  - function-node.tsx
  - index.tsx
  - merge-node.tsx
  - start-node.tsx
- **store/**
  - workflow-store.tsx
- **utils/**
  - export.ts
  - helpers.ts
  - import.ts
  - node-utils.ts
  - validation.ts
- page.tsx
- side-panel.tsx
- toolbar.tsx

### 🔸 Root Files
- globals.css
- layout.tsx
- page.tsx
- favicon.ico