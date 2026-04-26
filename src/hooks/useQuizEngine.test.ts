import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQuizEngine } from './useQuizEngine';

const mockQuestions = [
  {
    id: '1',
    content: 'Q1',
    options: ['A', 'B', 'C', 'D'],
    correct_answer: 0,
    explanation: 'Exp 1',
    created_at: '',
    created_by: '',
    subject_id: '',
    updated_at: ''
  },
  {
    id: '2',
    content: 'Q2',
    options: ['X', 'Y', 'Z', 'W'],
    correct_answer: 1,
    explanation: 'Exp 2',
    created_at: '',
    created_by: '',
    subject_id: '',
    updated_at: ''
  }
];

describe('useQuizEngine', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useQuizEngine(mockQuestions, 'sound.mp3'));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isFinished).toBe(false);
  });

  it('should allow selecting an answer', () => {
    const { result } = renderHook(() => useQuizEngine(mockQuestions, 'sound.mp3'));
    act(() => {
      result.current.handleSelectAnswer(2);
    });
    expect(result.current.stagedAnswer).toBe(2);
  });

  it('should confirm correct answer and move next', () => {
    const { result } = renderHook(() => useQuizEngine(mockQuestions, 'sound.mp3'));
    
    // Select correct answer for Q1 (idx 0)
    act(() => {
      result.current.handleSelectAnswer(0);
    });
    
    act(() => {
      result.current.confirmAnswer();
    });

    expect(result.current.hasAnsweredCurrent).toBe(true);
    expect(result.current.isCurrentCorrect).toBe(true);

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.hasAnsweredCurrent).toBe(false);
  });

  it('should finish when last question is handled', () => {
    const { result } = renderHook(() => useQuizEngine([mockQuestions[0]], 'sound.mp3'));
    
    act(() => {
      result.current.handleSelectAnswer(0);
      result.current.confirmAnswer();
    });

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.isFinished).toBe(true);
  });
});
