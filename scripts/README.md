# Campaign Runner Script

Bulk calling script that reads contacts from CSV, makes calls via Monade API, and outputs results with transcripts.

## Setup

```bash
cd scripts
pip install -r requirements.txt
```

## Usage

```bash
python campaign_runner.py \
  --input contacts.csv \
  --output results.csv \
  --assistant-id "95ec184e-21bd-4d4a-8aa0-6d3ca26e6f32" \
  --assistant-name "Technical Support Assistant" \
  --from-number "+13157918262" \
  --api-url "http://localhost:3000" \
  --delay 5
```

## Input CSV Format

```csv
name,number
Rahul,9867764589
Priya,9876543210
```

## Output CSV Format

```csv
name,number,call_id,call_status,transcript
Rahul,9867764589,AJ_abc123,completed,"Agent: Hello Rahul..."
Priya,9876543210,AJ_xyz789,no_answer,
```

## Call Status Values

| Status | Description |
|--------|-------------|
| `completed` | Call was answered, transcript available |
| `no_answer` | No answer or busy |
| `failed` | Call failed to initiate |

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `--input` | Yes | Input CSV file path |
| `--output` | Yes | Output CSV file path |
| `--assistant-id` | Yes | Assistant ID to use |
| `--assistant-name` | No | Assistant name (default: Campaign Assistant) |
| `--from-number` | Yes | Trunk phone number (e.g., +13157918262) |
| `--api-url` | No | Dashboard API URL (default: http://localhost:3000) |
| `--delay` | No | Delay between calls in seconds (default: 5) |
| `--skip-transcript` | No | Skip waiting for transcripts |

## Testing with 1 Call

```bash
# Make sure dev server is running
npm run dev

# Run with sample file
python campaign_runner.py \
  --input sample_contacts.csv \
  --output test_results.csv \
  --assistant-id "95ec184e-21bd-4d4a-8aa0-6d3ca26e6f32" \
  --assistant-name "Technical Support Assistant" \
  --from-number "+13157918262"
```
