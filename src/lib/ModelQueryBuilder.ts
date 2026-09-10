import type { ModelRecord } from "../types/model";

export type SortKey = "name-asc" | "name-desc" | "safetensor-asc" | "safetensor-desc";

export interface QueryState {
  search: string;
  pipelineTag: string | null;
  family: string | null;
  architectureTag: string | null;
  precisionTag: string | null;
  safetensorMin: number;
  safetensorMax: number;
  sort: SortKey;
}

export const DEFAULT_QUERY_STATE: QueryState = {
  search: "",
  pipelineTag: null,
  family: null,
  architectureTag: null,
  precisionTag: null,
  safetensorMin: 0,
  safetensorMax: Number.POSITIVE_INFINITY,
  sort: "name-asc",
};

/**
 * ModelQueryBuilder holds all current search/filter/sort state and exposes a
 * single `apply(models)` method that runs the whole pipeline. Keeping this
 * as a class (rather than scattering filter predicates across components)
 * makes the query logic independently testable and reusable, and matches
 * the OOP architecture requested by the assessment.
 */
export class ModelQueryBuilder {
  private state: QueryState = { ...DEFAULT_QUERY_STATE };

  public getState(): QueryState {
    return { ...this.state };
  }

  public setSearch(search: string): this {
    this.state.search = search;
    return this;
  }

  public setPipelineTag(pipelineTag: string | null): this {
    this.state.pipelineTag = pipelineTag;
    return this;
  }

  public setFamily(family: string | null): this {
    this.state.family = family;
    return this;
  }

  public setArchitectureTag(tag: string | null): this {
    this.state.architectureTag = tag;
    return this;
  }

  public setPrecisionTag(tag: string | null): this {
    this.state.precisionTag = tag;
    return this;
  }

  public setSafetensorRange(min: number, max: number): this {
    this.state.safetensorMin = min;
    this.state.safetensorMax = max;
    return this;
  }

  public setSort(sort: SortKey): this {
    this.state.sort = sort;
    return this;
  }

  public reset(): this {
    this.state = { ...DEFAULT_QUERY_STATE };
    return this;
  }

  /** Runs search -> filter -> sort against the given model list. */
  public apply(models: ModelRecord[]): ModelRecord[] {
    const q = this.state.search.trim().toLowerCase();

    let result = models.filter((m) => {
      if (q) {
        // substring match anywhere in the name, or family match
        const nameMatch = m.name.toLowerCase().includes(q);
        const familyMatch = (m.family ?? "").toLowerCase().includes(q);
        if (!nameMatch && !familyMatch) return false;
      }
      if (this.state.pipelineTag && m.pipelineTag !== this.state.pipelineTag) return false;
      if (this.state.family && m.family !== this.state.family) return false;
      if (this.state.architectureTag && !m.architectureTags.includes(this.state.architectureTag)) {
        return false;
      }
      if (this.state.precisionTag && !m.precisionTags.includes(this.state.precisionTag)) {
        return false;
      }
      if (m.safetensorCount < this.state.safetensorMin || m.safetensorCount > this.state.safetensorMax) {
        return false;
      }
      return true;
    });

    result = this.sortModels(result);
    return result;
  }

  private sortModels(models: ModelRecord[]): ModelRecord[] {
    const sorted = [...models];
    switch (this.state.sort) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "safetensor-asc":
        sorted.sort((a, b) => a.safetensorCount - b.safetensorCount);
        break;
      case "safetensor-desc":
        sorted.sort((a, b) => b.safetensorCount - a.safetensorCount);
        break;
    }
    return sorted;
  }

  /** Helper to derive distinct facet values from a model set, for populating filter dropdowns. */
  public static computeFacets(models: ModelRecord[]) {
    const pipelineTags = new Set<string>();
    const families = new Set<string>();
    const architectureTags = new Set<string>();
    const precisionTags = new Set<string>();
    let maxSafetensor = 0;

    for (const m of models) {
      if (m.pipelineTag) pipelineTags.add(m.pipelineTag);
      if (m.family) families.add(m.family);
      m.architectureTags.forEach((t) => architectureTags.add(t));
      m.precisionTags.forEach((t) => precisionTags.add(t));
      if (m.safetensorCount > maxSafetensor) maxSafetensor = m.safetensorCount;
    }

    return {
      pipelineTags: Array.from(pipelineTags).sort(),
      families: Array.from(families).sort(),
      architectureTags: Array.from(architectureTags).sort(),
      precisionTags: Array.from(precisionTags).sort(),
      maxSafetensor,
    };
  }
}
