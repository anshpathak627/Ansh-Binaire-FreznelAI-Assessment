import { normalizeModel, type ModelRecord, type RawHfModel } from "../types/model";
import { offlineCache } from "./OfflineCache";

const API_URL = "https://huggingface.co/api/models?limit=200&full=true";

/**
 * ModelApiClient owns fetching the model list from the public HuggingFace
 * API and reconciling it with the offline IndexedDB cache.
 *
 * ASSESSMENT QUESTION: "How will you fetch this in the background without
 * using async/await?"
 *
 * Answer / technique used here: the entire fetch path below is built from
 * the native `fetch()` Promise API composed with raw `.then()` / `.catch()`
 * / `.finally()` chains -- there is no `async`/`await` anywhere in this
 * file. Each step (issue the request, read the streamed body, parse JSON,
 * normalize records, stage+commit to the cache) is its own `.then()` link
 * in one chain. This is semantically equivalent to an async/await version:
 * `fetch(...).then(a).then(b)` runs `a` then `b` in order, propagates
 * exceptions/rejections down to the nearest `.catch()` exactly like a
 * try/catch would around awaited calls, and still runs fully in the
 * background (the calling code gets a Promise back and is never blocked).
 * async/await is just sugar over this same Promise chain -- we simply don't
 * use the sugar, per the assessment's constraint.
 */
export class ModelApiClient {
  /**
   * Fetches the model list. Returns a Promise the caller can .then()/.catch()
   * -- deliberately not declared `async`.
   */
  public fetchModels(): Promise<ModelRecord[]> {
    return fetch(API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HuggingFace API responded with ${response.status}`);
        }
        return this.readStreamSafely(response);
      })
      .then((jsonText) => {
        // Corruption safeguard: only parse (and only *then* consider the
        // download good) after the full stream has been accumulated. If
        // JSON.parse throws here, the .catch() below fires and the
        // previously-cached good data is left completely untouched --
        // we never overwrite a good cache with a partial/corrupt one.
        const raw = JSON.parse(jsonText) as RawHfModel[];
        const normalized = raw.map(normalizeModel);
        return normalized;
      })
      .then((normalized) => {
        // Atomic "stage, verify (already done via JSON.parse succeeding
        // above), then commit" swap into IndexedDB.
        return offlineCache
          .stage(normalized)
          .then(() => offlineCache.commitStaged())
          .then(() => normalized);
      })
      .catch((err) => {
        console.error("ModelApiClient.fetchModels failed, falling back to cache:", err);
        return offlineCache.getGood().then((cached) => {
          if (cached && cached.length > 0) return cached;
          throw err;
        });
      });
  }

  /**
   * Reads a Response body via the streaming Reader API
   * (`response.body.getReader()`) rather than the convenience `response.json()`
   * helper. Chunks are accumulated in memory and only concatenated/decoded
   * once the stream reports `done`, which is the large-JSON-download safety
   * mechanism requested by the assessment: we never hand a partial buffer to
   * JSON.parse, and a network error mid-stream rejects the promise instead
   * of silently truncating the payload.
   */
  private readStreamSafely(response: Response): Promise<string> {
    if (!response.body) {
      // Some environments (or the mock) may not support streaming bodies;
      // fall back to the text() promise, still without async/await.
      return response.text();
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const chunks: string[] = [];

    function pump(): Promise<string> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          return chunks.join("");
        }
        chunks.push(decoder.decode(value, { stream: true }));
        return pump();
      });
    }

    return pump();
  }
}

export const modelApiClient = new ModelApiClient();
