import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingSource = readFileSync(
  new URL("../src/components/LandingView.tsx", import.meta.url),
  "utf8"
);
const testSource = readFileSync(
  new URL("../src/components/TestView.tsx", import.meta.url),
  "utf8"
);
const resultsSource = readFileSync(
  new URL("../src/components/ResultsView.tsx", import.meta.url),
  "utf8"
);
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const indexCss = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

test("written instructions describe the implemented Japanese-to-English task", () => {
  assert.match(landingSource, /日本語の問題語に対応する英単語を選びます/u);
  assert.doesNotMatch(landingSource, /英単語に最も近い意味/u);
  assert.match(testSource, /日本語の問題語に対応する英単語を選んでください/u);
  assert.match(testSource, /日本語の問題語/u);
});

test("the written examinee interface does not expose item-bank frequency levels", () => {
  assert.doesNotMatch(testSource, /item\.Level/u);
  assert.doesNotMatch(testSource, />Level\s*\{/u);
});

test("written item-bank part-of-speech codes are localized for examinees", () => {
  assert.match(testSource, /noun: "名詞"/u);
  assert.match(testSource, /verb: "動詞"/u);
  assert.match(testSource, /adjective: "形容詞"/u);
  assert.match(testSource, /adverb: "副詞"/u);
  assert.doesNotMatch(testSource, />\{item\.PartOfSpeech\}</u);
});

test("written UI layout is bundled and does not depend on a third-party CSS CDN", () => {
  assert.match(indexHtml, /<html lang="ja">/u);
  assert.doesNotMatch(indexHtml, /cdnjs|bootstrap/u);
  assert.match(indexCss, /\.container\s*\{/u);
  assert.match(indexCss, /\.row\.g-4 > \.col-md-6/u);
});

test("written results identify the paper transformation without claiming a zero lower bound", () => {
  assert.match(resultsSource, /VST-NJ8原論文換算/u);
  assert.doesNotMatch(resultsSource, /0–8,000語尺度/u);
});
