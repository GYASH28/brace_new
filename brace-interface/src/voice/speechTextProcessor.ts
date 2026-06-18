export type PauseStyle = "short" | "natural" | "slow";
export type TechnicalReadingMode = "auto" | "on" | "off";

export type SpeechTextOptions = {
  humanLikeDelivery?: boolean;
  speakMarkdownSymbols?: boolean;
  removeMarkdown?: boolean;
  removeHashtags?: boolean;
  removeCodeBlocks?: boolean;
  makeHumanReadable?: boolean;
  pauseStyle?: PauseStyle;
  technicalReadingMode?: TechnicalReadingMode;
  allowCodeReadAloud?: boolean;
  maxChars?: number;
};

export type PreparedSpeechText = {
  rawText: string;
  spokenText: string;
  chunks: string[];
  rawLength: number;
  cleanedLength: number;
  wasTruncated: boolean;
};

const defaultOptions: Required<SpeechTextOptions> = {
  humanLikeDelivery: true,
  speakMarkdownSymbols: false,
  removeMarkdown: true,
  removeHashtags: true,
  removeCodeBlocks: true,
  makeHumanReadable: true,
  pauseStyle: "natural",
  technicalReadingMode: "auto",
  allowCodeReadAloud: false,
  maxChars: 3500,
};

function optionsWithDefaults(options: SpeechTextOptions = {}) {
  return { ...defaultOptions, ...options };
}

function stripEmoji(text: string) {
  return String(text || "").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ");
}

function humanizePathRest(value: string) {
  return String(value || "")
    .split(/[\\/]+/)
    .map((part) => part.replace(/B[._-]?R[._-]?A[._-]?C[._-]?E(?:[._-]?MAIN)?/gi, "B.R.A.C.E main").replace(/[._-]+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
}

export function speakableCommand(value: string) {
  return String(value || "")
    .replace(/https?:\/\/127\.0\.0\.1:\d+\/?/gi, "the local B.R.A.C.E page")
    .replace(/https?:\/\/localhost:\d+\/?/gi, "the local B.R.A.C.E page")
    .replace(/https?:\/\/\S+/gi, " link ")
    .replace(/([a-zA-Z]):\\([^`"'<>]+)/g, (_match, drive: string, rest: string) => `${drive.toUpperCase()} drive, ${humanizePathRest(rest)}`)
    .replace(/([a-zA-Z]+):([a-zA-Z0-9_.-]+)/g, "$1 $2")
    .replace(/[\\/_-]+/g, " ")
    .replace(/[.:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeMarkdownTables(text: string) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);
    })
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.includes("|")) return line;
      return trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(". ");
    })
    .join("\n");
}

function addSentencePeriod(text: string) {
  const clean = String(text || "").trim().replace(/[,:;]+$/g, "");
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function naturalizeIntro(text: string) {
  return String(text || "")
    .replace(/\bsure!\s*/gi, "Sure. ")
    .replace(/\bHere's\b/g, "Here is")
    .replace(/\bhere's\b/gi, "here is")
    .replace(/\b(answer|result|summary|plan):\s*/gi, "$1. ")
    .replace(/\bmain points:\s*/gi, "Main points. ")
    .replace(/\bsteps to run\b/gi, "Here are the steps")
    .replace(/\s+-\s+/g, ". ");
}

function cleanupMarkdown(text: string, options: Required<SpeechTextOptions>) {
  let output = String(text || "");

  output = output.replace(/\[tool:[^\]]+\]/gi, " ");
  output = output.replace(/<tool[\s\S]*?<\/tool>/gi, " ");
  output = output.replace(/^Route:\s*/gim, "");
  output = output.replace(/^Internal route:\s*/gim, "");
  output = removeMarkdownTables(output);

  if (options.removeCodeBlocks && !options.allowCodeReadAloud) {
    output = output.replace(/```[\s\S]*?```/g, " I have included the code block in chat. You can copy it from there. ");
  } else {
    output = output.replace(/```[a-zA-Z0-9_-]*\n?/g, " ").replace(/```/g, " ");
  }

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  output = output.replace(/`([^`]+)`/g, (_match, code: string) => speakableCommand(code));
  output = output.replace(/https?:\/\/127\.0\.0\.1:\d+\/?/gi, "the local B.R.A.C.E page");
  output = output.replace(/https?:\/\/localhost:\d+\/?/gi, "the local B.R.A.C.E page");
  output = output.replace(/https?:\/\/\S+/gi, " ");

  if (options.removeMarkdown && !options.speakMarkdownSymbols) {
    output = output
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+\u2022]\s+(.+)$/gm, "$1.")
      .replace(/^\s*\d+[.)]\s+(.+)$/gm, "$1.")
      .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
      .replace(/[*_~]/g, " ")
      .replace(/^\s*[-*_]{3,}\s*$/gm, " ");
  }

  if (options.removeHashtags) {
    output = output
      .split(/\r?\n/)
      .filter((line) => !/^\s*(#[\w-]+\s*)+$/.test(line.trim()))
      .map((line) => line.replace(/(^|\s)#[\w-]+/g, " "))
      .join("\n");
  }

  output = output
    .replace(/(^|\s)@([A-Za-z0-9_.-]+)/g, "$1$2")
    .replace(/([a-zA-Z]):\\([^"'<>]+)/g, (_match, drive: string, rest: string) => `${drive.toUpperCase()} drive, ${humanizePathRest(rest)}`)
    .replace(/\b([A-Za-z]+):([A-Za-z0-9_.-]+)\b/g, "$1 $2")
    .replace(/[<>[\]{}]/g, " ")
    .replace(/\s*[,;]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  return options.makeHumanReadable ? naturalizeIntro(output) : output;
}

export function splitIntoSpeechChunks(text: string, options: Pick<SpeechTextOptions, "pauseStyle"> = {}) {
  const pauseStyle = options.pauseStyle || "natural";
  const maxChunkLength = pauseStyle === "slow" ? 150 : pauseStyle === "short" ? 240 : 190;
  const normalized = String(text || "")
    .replace(/\s*([.!?])\s+/g, "$1\n")
    .replace(/\s*,\s+/g, pauseStyle === "short" ? ", " : ",\n")
    .replace(/\n+/g, "\n")
    .trim();
  const rawChunks = normalized.split(/\n+/).map((chunk) => chunk.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const rawChunk of rawChunks) {
    if (rawChunk.length <= maxChunkLength) {
      chunks.push(addSentencePeriod(rawChunk));
      continue;
    }
    const words = rawChunk.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChunkLength && current) {
        chunks.push(addSentencePeriod(current));
        current = word;
      } else {
        current = next;
      }
    }
    if (current) chunks.push(addSentencePeriod(current));
  }

  return chunks.slice(0, 28);
}

function wordCount(text: string) {
  return String(text || "").split(/\s+/).filter(Boolean).length;
}

export function prepareSpeechText(input: string | null | undefined, options: SpeechTextOptions = {}): PreparedSpeechText {
  const normalizedOptions = optionsWithDefaults(options);
  const rawText = String(input || "");
  if (!rawText.trim()) {
    return { rawText, spokenText: "", chunks: [], rawLength: rawText.length, cleanedLength: 0, wasTruncated: false };
  }

  let cleaned = cleanupMarkdown(stripEmoji(rawText), normalizedOptions);
  cleaned = cleaned
    .replace(/\s+([.!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\b(?:and|or)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (wordCount(cleaned) <= 1 && wordCount(rawText) > 5) {
    cleaned = stripEmoji(rawText).replace(/[`*_#~[\]{}<>|]/g, " ").replace(/\s+/g, " ").trim();
  }

  const maxChars = Math.max(200, Math.min(Number(normalizedOptions.maxChars || 3500), 6000));
  const wasTruncated = cleaned.length > maxChars;
  cleaned = cleaned.slice(0, maxChars).trim();
  const chunks = splitIntoSpeechChunks(cleaned, normalizedOptions);
  const spokenText = chunks.join("\n").trim();

  return {
    rawText,
    spokenText,
    chunks,
    rawLength: rawText.length,
    cleanedLength: spokenText.length,
    wasTruncated,
  };
}

export function sanitizeSpeechText(text: string) {
  return prepareSpeechText(text).spokenText;
}
