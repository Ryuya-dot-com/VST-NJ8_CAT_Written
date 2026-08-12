import { useEffect, useMemo, useRef, useState } from "react";
import { utils, writeFile } from "xlsx";
import "./App.css";
import { LandingView } from "./components/LandingView";
import { ResultsView } from "./components/ResultsView";
import { TestView } from "./components/TestView";
import type { Item } from "./types";
import { loadItemBank } from "./utils/data";
import { estimatePaperPosteriorEap } from "./utils/paperScoring";
import { shuffleArray } from "./utils/random";
import {
  RESEARCH_ADMINISTRATION_AUDIT_FIELDS,
  RESEARCH_ADMINISTRATION_POLICY,
  buildResearchAdministrationAudit,
  createResearchAdministrationRandom,
  createResearchAdministrationSeed,
  selectInitialResearchItem,
  selectNextResearchItem,
  shouldContinueResearchAdministration,
  type ResearchStopReason,
} from "./utils/researchAdministrationPolicy";
import {
  PUBLIC_OBSERVED_RESULT_FIELDS,
  assertPublicResultFieldsAllowed,
  buildPublicObservedResult,
} from "./utils/scoreReportingPolicy";

const TOTAL_ITEMS = RESEARCH_ADMINISTRATION_POLICY.fixedLength;
const TEST_LABEL = "筆記版";
type DownloadStatus = "idle" | "success" | "error";

const PUBLIC_SUMMARY_FIELDS = Object.freeze([
  ...PUBLIC_OBSERVED_RESULT_FIELDS,
  ...RESEARCH_ADMINISTRATION_AUDIT_FIELDS,
  "総回答時間（秒）",
  "平均回答時間（秒）",
  "A選択数",
  "B選択数",
  "C選択数",
  "D選択数",
]);

const PUBLIC_RESPONSE_FIELDS = Object.freeze([
  "問題番号",
  "項目ID",
  "単語",
  "品詞",
  "レベル",
  "選択ラベル",
  "選択回答",
  "正答",
  "正誤",
  "回答値",
  "回答時刻",
  "回答時間（秒）",
  "選択肢A",
  "選択肢B",
  "選択肢C",
  "選択肢D",
]);

interface ResultSnapshot {
  administered: number[];
  responses: (0 | 1)[];
  selectedLabels: string[];
  selectedAnswers: string[];
  optionOrders: string[][];
  responseTimes: number[];
  answerTimestamps: string[];
  administrationSeed: number;
  stopReason: ResearchStopReason;
  testStartedAtMs: number | null;
  testEndedAtMs: number | null;
}

function roundFinite(value: number, digits: number): number | null {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function formatTimestampForFilename(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function countSelectedLabels(labels: string[]) {
  return {
    A: labels.filter((label) => label === "A").length,
    B: labels.filter((label) => label === "B").length,
    C: labels.filter((label) => label === "C").length,
    D: labels.filter((label) => label === "D").length,
  };
}

function App() {
  const [itemBank, setItemBank] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [administered, setAdministered] = useState<number[]>([]);
  const [responses, setResponses] = useState<(0 | 1)[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [optionOrders, setOptionOrders] = useState<string[][]>([]);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [answerTimestamps, setAnswerTimestamps] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [questionStartMs, setQuestionStartMs] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [testStartedAtMs, setTestStartedAtMs] = useState<number | null>(null);
  const [testEndedAtMs, setTestEndedAtMs] = useState<number | null>(null);
  const [administrationSeed, setAdministrationSeed] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState<ResearchStopReason | null>(null);
  const selectionRandomRef = useRef<(() => number) | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadItemBank()
      .then((items) => {
        if (isMounted) {
          setItemBank(items);
        }
      })
      .catch((err: Error) => {
        console.error(err);
        if (isMounted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!started || done) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [started, done]);

  const currentItem = useMemo(
    () => (currentIndex !== null ? itemBank[currentIndex] : null),
    [currentIndex, itemBank]
  );

  const options = useMemo(() => {
    if (!currentItem) {
      return [];
    }
    return shuffleArray([
      currentItem.CorrectAnswer,
      currentItem.Distractor_1,
      currentItem.Distractor_2,
      currentItem.Distractor_3,
    ]);
  }, [currentItem]);

  const progressPct = Math.min(
    100,
    Math.round((administered.length / TOTAL_ITEMS) * 100)
  );

  const correctAnswers = responses.reduce<number>((acc, value) => acc + value, 0);
  const accuracy =
    responses.length > 0 ? (correctAnswers / responses.length) * 100 : 0;
  const handleStart = () => {
    if (loading || itemBank.length === 0) {
      return;
    }
    const seed = createResearchAdministrationSeed();
    const selectionRandom = createResearchAdministrationRandom(seed);
    const initialIndex = selectInitialResearchItem(itemBank, selectionRandom);

    const startedAt = Date.now();
    selectionRandomRef.current = selectionRandom;
    setStarted(true);
    setDone(false);
    setAdministered([]);
    setResponses([]);
    setSelectedLabels([]);
    setSelectedAnswers([]);
    setOptionOrders([]);
    setResponseTimes([]);
    setAnswerTimestamps([]);
    setCurrentIndex(initialIndex);
    setQuestionStartMs(startedAt);
    setDownloadStatus("idle");
    setTestStartedAtMs(startedAt);
    setTestEndedAtMs(null);
    setAdministrationSeed(seed);
    setStopReason(null);
  };

  const handleAnswer = (selectedLabel: string, option: string) => {
    if (
      !currentItem ||
      currentIndex === null ||
      done ||
      isProcessing ||
      questionStartMs === null ||
      administrationSeed === null ||
      selectionRandomRef.current === null
    ) {
      return;
    }

    setIsProcessing(true);
    const now = Date.now();
    const timeSpentSeconds = Math.max(0, (now - questionStartMs) / 1000);
    const roundedTime = Number(timeSpentSeconds.toFixed(2));

    const isCorrect: 0 | 1 = option === currentItem.CorrectAnswer ? 1 : 0;
    const nextAdministered = [...administered, currentIndex];
    const nextResponses = [...responses, isCorrect];
    const nextSelectedLabels = [...selectedLabels, selectedLabel];
    const nextSelectedAnswers = [...selectedAnswers, option];
    const nextOptionOrders = [...optionOrders, [...options]];
    const nextTimes = [...responseTimes, roundedTime];
    const nextAnswerTimestamps = [
      ...answerTimestamps,
      new Date(now).toLocaleString("ja-JP"),
    ];
    setAdministered(nextAdministered);
    setResponses(nextResponses);
    setSelectedLabels(nextSelectedLabels);
    setSelectedAnswers(nextSelectedAnswers);
    setOptionOrders(nextOptionOrders);
    setResponseTimes(nextTimes);
    setAnswerTimestamps(nextAnswerTimestamps);

    const estimate = estimatePaperPosteriorEap(
      itemBank,
      nextAdministered,
      nextResponses
    );
    const shouldContinue = shouldContinueResearchAdministration(
      nextAdministered.length
    );

    if (shouldContinue) {
      const nextIndex = selectNextResearchItem(
        itemBank,
        estimate.theta,
        nextAdministered,
        selectionRandomRef.current
      );
      if (nextIndex === null) {
        const finalStopReason: ResearchStopReason = "item-bank-exhausted";
        const nextSnapshot: ResultSnapshot = {
          administered: nextAdministered,
          responses: nextResponses,
          selectedLabels: nextSelectedLabels,
          selectedAnswers: nextSelectedAnswers,
          optionOrders: nextOptionOrders,
          responseTimes: nextTimes,
          answerTimestamps: nextAnswerTimestamps,
          administrationSeed,
          stopReason: finalStopReason,
          testStartedAtMs,
          testEndedAtMs: now,
        };
        setDone(true);
        setStopReason(finalStopReason);
        setTestEndedAtMs(now);
        setCurrentIndex(null);
        setQuestionStartMs(null);
        downloadResultWorkbook(nextSnapshot);
      } else {
        setCurrentIndex(nextIndex);
        setQuestionStartMs(Date.now());
      }
    } else {
      const finalStopReason: ResearchStopReason = "fixed-length";
      const nextSnapshot: ResultSnapshot = {
        administered: nextAdministered,
        responses: nextResponses,
        selectedLabels: nextSelectedLabels,
        selectedAnswers: nextSelectedAnswers,
        optionOrders: nextOptionOrders,
        responseTimes: nextTimes,
        answerTimestamps: nextAnswerTimestamps,
        administrationSeed,
        stopReason: finalStopReason,
        testStartedAtMs,
        testEndedAtMs: now,
      };
      setDone(true);
      setStopReason(finalStopReason);
      setTestEndedAtMs(now);
      setCurrentIndex(null);
      setQuestionStartMs(null);
      downloadResultWorkbook(nextSnapshot);
    }

    setIsProcessing(false);
  };

  const downloadResultWorkbook = (snapshot: ResultSnapshot) => {
    const snapshotCorrectAnswers = snapshot.responses.reduce<number>(
      (acc, value) => acc + value,
      0
    );
    const snapshotAccuracy =
      snapshot.responses.length > 0
        ? (snapshotCorrectAnswers / snapshot.responses.length) * 100
        : 0;
    const snapshotTotalTimeSeconds = snapshot.responseTimes.reduce(
      (acc, value) => acc + value,
      0
    );
    const snapshotAverageTimeSeconds =
      snapshot.responseTimes.length > 0
        ? snapshotTotalTimeSeconds / snapshot.responseTimes.length
        : 0;
    const selectedLabelCounts = countSelectedLabels(snapshot.selectedLabels);
    const createdAt = new Date();

    const responsesSheet = snapshot.administered.map((idx, i) => {
      const item = itemBank[idx];
      const isCorrect = snapshot.responses[i] === 1;
      const timeSeconds = snapshot.responseTimes[i] ?? null;
      const optionOrder = snapshot.optionOrders[i] ?? [];
      return {
        問題番号: i + 1,
        項目ID: idx + 1,
        単語: item.Item,
        品詞: item.PartOfSpeech || "",
        レベル: item.Level,
        選択ラベル: snapshot.selectedLabels[i] ?? "",
        選択回答: snapshot.selectedAnswers[i] ?? "",
        正答: item.CorrectAnswer,
        正誤: isCorrect ? "正解" : "不正解",
        回答値: snapshot.responses[i],
        回答時刻: snapshot.answerTimestamps[i] ?? "",
        "回答時間（秒）": timeSeconds,
        選択肢A: optionOrder[0] ?? "",
        選択肢B: optionOrder[1] ?? "",
        選択肢C: optionOrder[2] ?? "",
        選択肢D: optionOrder[3] ?? "",
      };
    });

    const summarySheet = [
      {
        ...buildPublicObservedResult({
          testLabel: TEST_LABEL,
          userName,
          startedAt: snapshot.testStartedAtMs
            ? new Date(snapshot.testStartedAtMs).toLocaleString("ja-JP")
            : "",
          endedAt: snapshot.testEndedAtMs
            ? new Date(snapshot.testEndedAtMs).toLocaleString("ja-JP")
            : createdAt.toLocaleString("ja-JP"),
          administeredItems: snapshot.administered.length,
          correctAnswers: snapshotCorrectAnswers,
          accuracyPercent: roundFinite(snapshotAccuracy, 1),
        }),
        ...buildResearchAdministrationAudit(
          snapshot.administrationSeed,
          snapshot.stopReason
        ),
        "総回答時間（秒）": roundFinite(snapshotTotalTimeSeconds, 2),
        "平均回答時間（秒）": roundFinite(snapshotAverageTimeSeconds, 2),
        A選択数: selectedLabelCounts.A,
        B選択数: selectedLabelCounts.B,
        C選択数: selectedLabelCounts.C,
        D選択数: selectedLabelCounts.D,
      },
    ];
    assertPublicResultFieldsAllowed(summarySheet, PUBLIC_SUMMARY_FIELDS);
    assertPublicResultFieldsAllowed(responsesSheet, PUBLIC_RESPONSE_FIELDS);

    try {
      const workbook = utils.book_new();
      const summaryWorksheet = utils.json_to_sheet(summarySheet);
      const responsesWorksheet = utils.json_to_sheet(responsesSheet);
      summaryWorksheet["!cols"] = [
        { wch: 14 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];
      responsesWorksheet["!cols"] = [
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 14 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];
      utils.book_append_sheet(workbook, summaryWorksheet, "概要");
      utils.book_append_sheet(workbook, responsesWorksheet, "回答履歴");

      const timestamp = formatTimestampForFilename(createdAt);
      writeFile(workbook, `jacet_cat_written_result_${timestamp}.xlsx`);
      setDownloadStatus("success");
    } catch (error) {
      console.error("Failed to download result workbook.", error);
      setDownloadStatus("error");
    }
  };

  const handleDownload = () => {
    if (administrationSeed === null || stopReason === null) {
      setDownloadStatus("error");
      return;
    }
    downloadResultWorkbook({
      administered,
      responses,
      selectedLabels,
      selectedAnswers,
      optionOrders,
      responseTimes,
      answerTimestamps,
      administrationSeed,
      stopReason,
      testStartedAtMs,
      testEndedAtMs,
    });
  };

  const handleRestart = () => {
    setStarted(false);
    setDone(false);
    setAdministered([]);
    setResponses([]);
    setSelectedLabels([]);
    setSelectedAnswers([]);
    setOptionOrders([]);
    setResponseTimes([]);
    setAnswerTimestamps([]);
    setCurrentIndex(null);
    setQuestionStartMs(null);
    setIsProcessing(false);
    setDownloadStatus("idle");
    setTestStartedAtMs(null);
    setTestEndedAtMs(null);
    setAdministrationSeed(null);
    setStopReason(null);
    selectionRandomRef.current = null;
  };

  if (!started) {
    return (
      <LandingView
        name={userName}
        onNameChange={setUserName}
        onStart={handleStart}
        loading={loading}
        error={error}
      />
    );
  }

  if (done) {
    return (
      <ResultsView
        userName={userName}
        totalItems={administered.length}
        correctAnswers={correctAnswers}
        accuracy={Math.round(accuracy * 10) / 10}
        downloadStatus={downloadStatus}
        onDownload={handleDownload}
        onRestart={handleRestart}
      />
    );
  }

  if (!currentItem) {
    return null;
  }

  return (
    <TestView
      item={currentItem}
      questionNumber={administered.length + 1}
      totalQuestions={TOTAL_ITEMS}
      progressPct={progressPct}
      options={options}
      onSelect={handleAnswer}
      isProcessing={isProcessing}
    />
  );
}

export default App;
