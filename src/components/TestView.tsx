import type { Item } from "../types";

interface TestViewProps {
  item: Item;
  questionNumber: number;
  totalQuestions: number;
  progressPct: number;
  options: string[];
  onSelect: (value: string) => void;
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

              <div className="progress modern-progress mb-4" role="progressbar">
                <div
                  className="progress-bar"
                  style={{ width: `${progressPct}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {progressPct}%
                </div>
              </div>

              <div className="question-panel text-center">
                <h2 className="question-word">{item.Item}</h2>
              </div>

              <div className="option-grid mt-5">
                {options.map((option, idx) => (
                  <button
                    key={`${item.id}-${idx}-${option}`}
                    type="button"
                    className="option-button"
                    onClick={() => onSelect(option)}
                    disabled={isProcessing}
                  >
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
