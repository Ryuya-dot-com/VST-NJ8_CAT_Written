import type { Item } from "../types";

interface TestViewProps {
  item: Item;
  questionNumber: number;
  totalQuestions: number;
  progressPct: number;
  options: string[];
  onSelect: (label: string, value: string) => void;
  isProcessing: boolean;
}

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
};

export function TestView({
  item,
  questionNumber,
  totalQuestions,
  progressPct,
  options,
  onSelect,
  isProcessing,
}: TestViewProps) {
  const partOfSpeechLabel =
    PART_OF_SPEECH_LABELS[item.PartOfSpeech.toLowerCase()];

  return (
    <div className="app-shell">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-xl-8">
            <div className="surface-card p-5">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <span className="pill pill-accent">
                  問題 {questionNumber} / {totalQuestions}
                </span>
                {partOfSpeechLabel && (
                  <span className="pill pill-tonal">{partOfSpeechLabel}</span>
                )}
              </div>

              <p className="test-instruction">
                日本語の問題語に対応する英単語を選んでください。
                選択するとすぐ次の問題へ進みます。
              </p>

              <div
                className="progress modern-progress mb-4"
                role="progressbar"
                aria-label="テストの進行状況"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-bar"
                  style={{ width: `${progressPct}%` }}
                >
                  {progressPct}%
                </div>
              </div>

              <div className="question-panel text-center">
                <p className="question-label">日本語の問題語</p>
                <h2 className="question-word">{item.Item}</h2>
              </div>

              <div className="option-grid mt-5">
                {options.map((option, idx) => {
                  const labelText = String.fromCharCode(65 + idx);
                  return (
                    <button
                      key={`${item.id}-${idx}-${option}`}
                      type="button"
                      className="option-button"
                      onClick={() => onSelect(labelText, option)}
                      disabled={isProcessing}
                      aria-label={`選択肢${labelText}: ${option}`}
                    >
                      <span className="option-letter">{labelText}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
