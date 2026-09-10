// Shared domain types for HuggingFace models used across the app.

export interface HfSibling {
  rfilename: string;
}

/** Raw shape (subset) returned by https://huggingface.co/api/models */
export interface RawHfModel {
  id: string;
  pipeline_tag?: string;
  tags?: string[];
  library_name?: string;
  siblings?: HfSibling[];
  likes?: number;
  downloads?: number;
  lastModified?: string;
}

/** Normalized model record used throughout the UI/query layer. */
export interface ModelRecord {
  id: string;
  name: string;
  pipelineTag: string | null;
  family: string | null;
  architectureTags: string[];
  precisionTags: string[];
  allTags: string[];
  safetensorCount: number;
  likes: number;
  downloads: number;
  lastModified: string | null;
}

const KNOWN_FAMILIES = [
  "bert",
  "llama",
  "gpt2",
  "gpt-neo",
  "gptj",
  "t5",
  "mistral",
  "mixtral",
  "falcon",
  "bloom",
  "roberta",
  "distilbert",
  "clip",
  "whisper",
  "stable-diffusion",
  "qwen",
  "gemma",
  "phi",
  "vit",
  "electra",
  "xlnet",
  "bart",
];

const PRECISION_TAGS = ["fp16", "fp32", "bf16", "int8", "int4", "gguf", "gptq", "awq", "8bit", "4bit"];

const ARCHITECTURE_HINTS = [
  "transformer",
  "diffusers",
  "cnn",
  "rnn",
  "lstm",
  "encoder-decoder",
  "decoder-only",
  "encoder-only",
  "mixture-of-experts",
  "moe",
  "u-net",
  "resnet",
  "vae",
];

/** Derives a model "family" from tags first, falling back to the org/name prefix. */
function deriveFamily(id: string, tags: string[]): string | null {
  const lowerTags = tags.map((t) => t.toLowerCase());
  for (const fam of KNOWN_FAMILIES) {
    if (lowerTags.includes(fam)) return fam;
  }
  const lowerId = id.toLowerCase();
  for (const fam of KNOWN_FAMILIES) {
    if (lowerId.includes(fam)) return fam;
  }
  // fall back to org prefix ("org/name" -> "org"), else first token of the name
  const slashIdx = id.indexOf("/");
  if (slashIdx > 0) return id.slice(0, slashIdx).toLowerCase();
  return null;
}

function countSafetensors(siblings: HfSibling[] | undefined): number {
  if (!siblings) return 0;
  return siblings.filter((s) => s.rfilename && s.rfilename.endsWith(".safetensors")).length;
}

/** Converts a raw HF API model object into our normalized ModelRecord shape. */
export function normalizeModel(raw: RawHfModel): ModelRecord {
  const tags = raw.tags ?? [];
  const lowerTags = tags.map((t) => t.toLowerCase());
  return {
    id: raw.id,
    name: raw.id,
    pipelineTag: raw.pipeline_tag ?? null,
    family: deriveFamily(raw.id, tags),
    architectureTags: tags.filter((t) => ARCHITECTURE_HINTS.includes(t.toLowerCase())),
    precisionTags: tags.filter((t) => PRECISION_TAGS.includes(t.toLowerCase())),
    allTags: tags,
    safetensorCount: countSafetensors(raw.siblings),
    likes: raw.likes ?? 0,
    downloads: raw.downloads ?? 0,
    lastModified: raw.lastModified ?? null,
    // precision detection above intentionally re-uses lowerTags implicitly via filter; kept for clarity
    ...(lowerTags.length ? {} : {}),
  };
}
