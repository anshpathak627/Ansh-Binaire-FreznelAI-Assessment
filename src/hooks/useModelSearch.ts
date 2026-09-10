import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { modelApiClient } from "../lib/ModelApiClient";
import { offlineCache } from "../lib/OfflineCache";
import { ModelQueryBuilder, type SortKey } from "../lib/ModelQueryBuilder";
import { Debouncer } from "../lib/Debouncer";
import { Throttler } from "../lib/Throttler";
import type { ModelRecord } from "../types/model";
import { useConnectivity } from "./useConnectivity";

const SEARCH_DEBOUNCE_MS = 350;
const FETCH_THROTTLE_MS = 1500;

/**
 * useModelSearch is a thin React hook that wires the OOP classes
 * (ModelApiClient, ModelQueryBuilder, Debouncer, Throttler, OfflineCache)
 * into component state. All actual search/filter/sort/debounce/throttle
 * logic lives in the classes themselves -- this hook only holds React state
 * and forwards events.
 */
export function useModelSearch() {
  const [allModels, setAllModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const { isOnline } = useConnectivity();

  const [searchInput, setSearchInput] = useState("");
  const [queryVersion, setQueryVersion] = useState(0);

  const queryBuilder = useRef(new ModelQueryBuilder()).current;
  const debouncer = useRef(new Debouncer<[]>(SEARCH_DEBOUNCE_MS)).current;
  const throttler = useRef(new Throttler<[]>(FETCH_THROTTLE_MS)).current;

  const bumpQueryVersion = useCallback(() => setQueryVersion((v) => v + 1), []);

  // Initial + reconnect load: fetch fresh, falling back to cache.
  const loadModels = useCallback(() => {
    setLoading(true);
    // Throttled: even if loadModels is invoked repeatedly in quick
    // succession (e.g. connectivity flapping), the underlying network
    // fetch fires at most once per FETCH_THROTTLE_MS.
    throttler.trigger(() => {
      modelApiClient
        .fetchModels()
        .then((models) => {
          setAllModels(models);
          setUsingCache(!isOnline);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load models");
          return offlineCache.getGood().then((cached) => {
            if (cached) {
              setAllModels(cached);
              setUsingCache(true);
            }
          });
        })
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when connectivity flips back online.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (!wasOnline.current && isOnline) {
      loadModels();
    }
    wasOnline.current = isOnline;
  }, [isOnline, loadModels]);

  // Debounced search box: only updates query state (and thus re-filters)
  // after the user pauses typing for SEARCH_DEBOUNCE_MS.
  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncer.trigger(() => {
        queryBuilder.setSearch(value);
        bumpQueryVersion();
      });
    },
    [debouncer, queryBuilder, bumpQueryVersion]
  );

  const setPipelineTag = useCallback(
    (v: string | null) => {
      queryBuilder.setPipelineTag(v);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const setFamily = useCallback(
    (v: string | null) => {
      queryBuilder.setFamily(v);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const setArchitectureTag = useCallback(
    (v: string | null) => {
      queryBuilder.setArchitectureTag(v);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const setPrecisionTag = useCallback(
    (v: string | null) => {
      queryBuilder.setPrecisionTag(v);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const setSafetensorRange = useCallback(
    (min: number, max: number) => {
      queryBuilder.setSafetensorRange(min, max);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const setSort = useCallback(
    (v: SortKey) => {
      queryBuilder.setSort(v);
      bumpQueryVersion();
    },
    [queryBuilder, bumpQueryVersion]
  );
  const resetFilters = useCallback(() => {
    queryBuilder.reset();
    setSearchInput("");
    bumpQueryVersion();
  }, [queryBuilder, bumpQueryVersion]);

  const filteredModels = useMemo(() => {
    // queryVersion is an intentional dependency: it changes whenever the
    // (mutable) queryBuilder's internal state changes, forcing this memo
    // to recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return queryBuilder.apply(allModels);
  }, [allModels, queryVersion]);

  const facets = useMemo(() => ModelQueryBuilder.computeFacets(allModels), [allModels]);

  return {
    loading,
    error,
    usingCache,
    isOnline,
    searchInput,
    handleSearchInput,
    setPipelineTag,
    setFamily,
    setArchitectureTag,
    setPrecisionTag,
    setSafetensorRange,
    setSort,
    resetFilters,
    queryState: queryBuilder.getState(),
    facets,
    models: filteredModels,
    totalCount: allModels.length,
    reload: loadModels,
  };
}
