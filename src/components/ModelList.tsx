import { Flex, View, Text, Heading, TooltipTrigger, Tooltip } from "@adobe/react-spectrum";
import type { ModelRecord } from "../types/model";

interface Props {
  models: ModelRecord[];
}

export function ModelListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="model-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line" style={{ width: "70%", height: 16 }} />
          <div className="skeleton-line" style={{ width: "40%" }} />
          <Flex gap="size-100">
            <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 999 }} />
            <div className="skeleton-line" style={{ width: 80, height: 20, borderRadius: 999 }} />
          </Flex>
        </div>
      ))}
    </div>
  );
}

export default function ModelList({ models }: Props) {
  if (models.length === 0) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state-icon" aria-hidden="true">
          🔎
        </div>
        <Heading level={3} margin={0}>
          No models found
        </Heading>
        <Text>Try adjusting or resetting your search and filters.</Text>
      </div>
    );
  }

  return (
    <div className="model-grid">
      {models.map((m, i) => (
        <View
          key={m.id}
          borderRadius="medium"
          padding="size-200"
          UNSAFE_className="model-card fade-in-item"
          UNSAFE_style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
        >
          <Flex direction="column" gap="size-100">
            <TooltipTrigger delay={400}>
              <Heading level={4} margin={0} UNSAFE_className="model-card-name">
                {m.name}
              </Heading>
              <Tooltip>{m.name}</Tooltip>
            </TooltipTrigger>

            <Flex wrap gap="size-75" alignItems="center">
              {m.pipelineTag && <span className="tag-pill tag-pipeline">{m.pipelineTag}</span>}
              {m.family && <span className="tag-pill tag-family">{m.family}</span>}
              {m.precisionTags.map((t) => (
                <span key={t} className="tag-pill tag-precision">
                  {t}
                </span>
              ))}
              {m.architectureTags.map((t) => (
                <span key={t} className="tag-pill tag-architecture">
                  {t}
                </span>
              ))}
            </Flex>

            <span className="safetensor-count">{m.safetensorCount} safetensor file(s)</span>
          </Flex>
        </View>
      ))}
    </div>
  );
}
