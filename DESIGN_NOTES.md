# Design Notes

## 1. How is the model list fetched in the background without `async`/`await`?

`src/lib/ModelApiClient.ts` (`ModelApiClient.fetchModels`) implements the entire fetch flow —
issue the request, stream and accumulate the response body, parse JSON, normalize records, and
persist them to the offline cache — without using `async`/`await` anywhere in that file.

Instead, the native `fetch()` Promise is composed purely with `.then()` / `.catch()` / `.finally()`
chaining:

```
fetch(API_URL)
  -> .then(check response.ok, then stream the body via a reader)
  -> .then(JSON.parse the fully-accumulated text)
  -> .then(normalize + stage/commit to IndexedDB)
  -> .catch(fall back to the last good cached copy)
```

The streaming step itself (`readStreamSafely`) is a small recursive function (`pump`) that calls
`reader.read()` and, in its `.then()` callback, either returns the joined chunks (when `done`) or
recurses to read the next chunk — the same technique used for the chunked-upload flow in the
sibling project's `ChunkedUploader`, applied here to a chunked *download* instead.

We chose Promise `.then()` chaining (rather than XHR, though either satisfies the constraint)
because:

- It demonstrates that promise-based asynchronous flow doesn't require the `async`/`await`
  syntactic sugar — the same guarantees (ordering, error propagation, composability) are achieved
  with plain `.then()`/`.catch()` chaining. `async`/`await` is sugar over exactly this kind of
  chain; we simply don't use the sugar.
- `fetch()` + `response.body.getReader()` gives direct access to the streamed body, which we need
  anyway for the large-JSON safeguard described below.
- A single `.catch()` on the outer chain centralizes error handling for every step (network
  failure, non-2xx status, malformed JSON, IndexedDB write failure), and transparently falls back
  to the last known-good cached model list so the UI never has to special-case where the data came
  from.

## 2. How is large-JSON download safety/corruption prevented?

Two complementary mechanisms protect against a corrupted or truncated download of the (large)
model list JSON ever poisoning the app's data:

1. **Streamed accumulation, not a single blocking parse of a partial buffer.** Instead of calling
   the convenience `response.json()` (which gives no visibility into partial failures),
   `readStreamSafely` reads the response body via `response.body.getReader()` and accumulates
   decoded text chunks in an array. Only once the reader reports `done: true` (the stream is
   fully, successfully drained) is the full text handed onward. If the connection drops mid-stream,
   `reader.read()` rejects, the promise chain's `.catch()` fires, and no partial text ever reaches
   `JSON.parse`.

2. **Parse-then-atomically-swap into the offline cache.** `JSON.parse` is only called on the fully
   accumulated string, and if it throws (e.g. the payload was truncated in some way the stream
   reader didn't catch, or the server sent malformed JSON), the whole chain rejects and falls into
   the `.catch()` fallback — the previously cached good data is left completely untouched.
   Only after `JSON.parse` succeeds and records are normalized do we touch IndexedDB, and even then
   we don't overwrite the existing "good" object store directly: `OfflineCache.stage()` writes the
   new data into a separate `models_temp` object store first, and only `OfflineCache.commitStaged()`
   — called immediately after, inside the same success branch of the promise chain — copies that
   staged record over the `models` (good) object store inside a single read-write IndexedDB
   transaction. If staging throws, the good store was never touched. This is the same
   "write to temp key, verify, then swap" pattern as an atomic file rename: readers of the good
   store (i.e. anything that falls back to cache when offline) only ever see a fully-verified,
   successfully-parsed snapshot, never a half-written one.

Together, streaming bounds how a truncated network response can hurt us (it simply fails the
promise instead of feeding a partial buffer into `JSON.parse`), and the stage-then-commit pattern
guarantees the on-disk (IndexedDB) cache is only ever replaced by a payload that has already been
proven to parse and normalize correctly.
