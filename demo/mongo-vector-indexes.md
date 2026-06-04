# MongoDB Vector Search Indexes

Create these indexes in MongoDB Atlas. Local MongoDB will still work with DebugPilot because the app falls back to cosine similarity in application code.

## `code_chunks`

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "repoId"
    }
  ]
}
```

Index name:

```text
code_embedding_index
```

## `incident_memories`

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

Index name:

```text
incident_memory_embedding_index
```
