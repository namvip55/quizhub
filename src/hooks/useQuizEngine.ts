import { useState, useEffect, useRef } from "react";
import type { Question } from "@/services/exam.service";

export function useQuizEngine(questions: Question[], tingTingSound: string) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [stagedAnswer, setStagedAnswer] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(tingTingSound);
  }, [tingTingSound]);

  const currentQuestion = questions[currentIndex];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== undefined;
  const isCurrentCorrect = selectedAnswers[currentIndex] === currentQuestion?.correct_answer;

  const handleSelectAnswer = (optionIdx: number) => {
    if (hasAnsweredCurrent) return;
    setStagedAnswer(optionIdx);
  };

  const confirmAnswer = () => {
    if (stagedAnswer === null || hasAnsweredCurrent) return;

    const optionIdx = stagedAnswer;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionIdx }));
    
    const isCorrect = optionIdx === currentQuestion.correct_answer;
    if (isCorrect && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
    setStagedAnswer(null);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setStagedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setStagedAnswer(null);
    }
  };

  const reset = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setStagedAnswer(null);
    setIsFinished(false);
  };

  return {
    currentIndex,
    currentQuestion,
    selectedAnswers,
    stagedAnswer,
    isFinished,
    hasAnsweredCurrent,
    isCurrentCorrect,
    handleSelectAnswer,
    confirmAnswer,
    handleNext,
    handlePrev,
    reset,
  };
}
