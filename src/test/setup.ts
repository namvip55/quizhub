import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mocking global objects if needed
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
}));
