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

export function TestView({
  item,
  questionNumber,
  totalQuestions,
  progressPct,
  options,
  onSelect,
  isProcessing,
}: TestViewProps) {
  const hasPartOfSpeech = Boolean(item.PartOfSpeech && item.PartOfSpeech !== "-");

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
                <div className="d-flex flex-wrap gap-2">
                  {hasPartOfSpeech && (
                    <span className="pill pill-tonal">{item.PartOfSpeech}</span>
                  )}
                  <span className="pill pill-neutral">Level {item.Level}</span>
                </div>
              </div>

              <p className="test-instruction">
                最も近い意味を選んでください。選択するとすぐ次の問題へ進みます。
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
                <p className="question-label">単語</p>
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
