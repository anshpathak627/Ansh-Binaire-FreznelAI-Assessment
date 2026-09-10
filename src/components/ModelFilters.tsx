import { Flex, Picker, Item, SearchField, RangeSlider, Button, View } from "@adobe/react-spectrum";
import type { SortKey } from "../lib/ModelQueryBuilder";

interface Facets {
  pipelineTags: string[];
  families: string[];
  architectureTags: string[];
  precisionTags: string[];
  maxSafetensor: number;
}

interface Props {
  searchInput: string;
  onSearchChange: (v: string) => void;
  facets: Facets;
  pipelineTag: string | null;
  family: string | null;
  architectureTag: string | null;
  precisionTag: string | null;
  safetensorMin: number;
  safetensorMax: number;
  sort: SortKey;
  onPipelineTag: (v: string | null) => void;
  onFamily: (v: string | null) => void;
  onArchitectureTag: (v: string | null) => void;
  onPrecisionTag: (v: string | null) => void;
  onSafetensorRange: (min: number, max: number) => void;
  onSort: (v: SortKey) => void;
  onReset: () => void;
}

const NONE_KEY = "__none__";

export default function ModelFilters(props: Props) {
  const effectiveMax = Math.max(props.facets.maxSafetensor, 1);

  const activeChips: { key: string; label: string; onClear: () => void }[] = [];
  if (props.pipelineTag) {
    activeChips.push({
      key: "pipeline",
      label: `Pipeline: ${props.pipelineTag}`,
      onClear: () => props.onPipelineTag(null),
    });
  }
  if (props.family) {
    activeChips.push({
      key: "family",
      label: `Family: ${props.family}`,
      onClear: () => props.onFamily(null),
    });
  }
  if (props.architectureTag) {
    activeChips.push({
      key: "architecture",
      label: `Architecture: ${props.architectureTag}`,
      onClear: () => props.onArchitectureTag(null),
    });
  }
  if (props.precisionTag) {
    activeChips.push({
      key: "precision",
      label: `Precision: ${props.precisionTag}`,
      onClear: () => props.onPrecisionTag(null),
    });
  }

  return (
    <View
      borderRadius="medium"
      padding="size-250"
      marginBottom="size-250"
      UNSAFE_className="filters-panel"
    >
      <Flex wrap gap="size-200" alignItems="end">
        <SearchField
          label="Search (name or family)"
          value={props.searchInput}
          onChange={props.onSearchChange}
          width="size-3000"
        />

        <Picker
          label="Pipeline tag"
          selectedKey={props.pipelineTag ?? NONE_KEY}
          onSelectionChange={(k) => props.onPipelineTag(k === NONE_KEY ? null : String(k))}
          width="size-2000"
        >
          {[
            <Item key={NONE_KEY}>Any</Item>,
            ...props.facets.pipelineTags.map((t) => <Item key={t}>{t}</Item>),
          ]}
        </Picker>

        <Picker
          label="Family"
          selectedKey={props.family ?? NONE_KEY}
          onSelectionChange={(k) => props.onFamily(k === NONE_KEY ? null : String(k))}
          width="size-2000"
        >
          {[
            <Item key={NONE_KEY}>Any</Item>,
            ...props.facets.families.map((t) => <Item key={t}>{t}</Item>),
          ]}
        </Picker>

        <Picker
          label="Architecture"
          selectedKey={props.architectureTag ?? NONE_KEY}
          onSelectionChange={(k) => props.onArchitectureTag(k === NONE_KEY ? null : String(k))}
          width="size-2000"
        >
          {[
            <Item key={NONE_KEY}>Any</Item>,
            ...props.facets.architectureTags.map((t) => <Item key={t}>{t}</Item>),
          ]}
        </Picker>

        <Picker
          label="Precision / weight"
          selectedKey={props.precisionTag ?? NONE_KEY}
          onSelectionChange={(k) => props.onPrecisionTag(k === NONE_KEY ? null : String(k))}
          width="size-2000"
        >
          {[
            <Item key={NONE_KEY}>Any</Item>,
            ...props.facets.precisionTags.map((t) => <Item key={t}>{t}</Item>),
          ]}
        </Picker>

        <Picker
          label="Sort by"
          selectedKey={props.sort}
          onSelectionChange={(k) => props.onSort(k as SortKey)}
          width="size-2400"
        >
          <Item key="name-asc">Name A → Z</Item>
          <Item key="name-desc">Name Z → A</Item>
          <Item key="safetensor-asc">Safetensor count ↑</Item>
          <Item key="safetensor-desc">Safetensor count ↓</Item>
        </Picker>

        <Button variant="secondary" onPress={props.onReset}>
          Reset filters
        </Button>
      </Flex>

      {activeChips.length > 0 && (
        <Flex wrap gap="size-100" marginTop="size-200" alignItems="center">
          {activeChips.map((chip) => (
            <span className="active-filter-chip" key={chip.key}>
              {chip.label}
              <button type="button" onClick={chip.onClear} aria-label={`Clear ${chip.label}`}>
                ×
              </button>
            </span>
          ))}
        </Flex>
      )}

      <View marginTop="size-200" maxWidth="size-4600" UNSAFE_className="accent-slider">
        <RangeSlider
          label="Safetensor file count"
          minValue={0}
          maxValue={effectiveMax}
          value={{
            start: Math.min(props.safetensorMin, effectiveMax),
            end: Number.isFinite(props.safetensorMax) ? Math.min(props.safetensorMax, effectiveMax) : effectiveMax,
          }}
          onChange={(range) => props.onSafetensorRange(range.start, range.end)}
        />
      </View>
    </View>
  );
}
