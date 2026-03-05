import { describe, it, expect } from 'vitest';
import {
  calculateSleepScore,
  calculateMetrics,
  estimateTrainingLoad,
  type TrendData,
} from '@/lib/metricsCalculator';

describe('calculateSleepScore', () => {
  it('should calculate sleep score correctly with optimal values', () => {
    const score = calculateSleepScore(90, 480);
    expect(score).toBe(93);
  });

  it('should cap duration score at 8 hours', () => {
    const score1 = calculateSleepScore(90, 480);
    const score2 = calculateSleepScore(90, 600);
    expect(score1).toBe(score2);
  });

  it('should handle poor efficiency', () => {
    const score = calculateSleepScore(50, 480);
    expect(score).toBe(65);
  });

  it('should handle short duration', () => {
    const score = calculateSleepScore(90, 240);
    expect(score).toBe(78);
  });

  it('should handle very short duration', () => {
    const score = calculateSleepScore(90, 120);
    expect(score).toBe(71);
  });

  it('should handle zero duration', () => {
    const score = calculateSleepScore(90, 0);
    expect(score).toBe(63);
  });

  it('should handle 100% efficiency', () => {
    const score = calculateSleepScore(100, 480);
    expect(score).toBe(100);
  });

  it('should round to nearest integer', () => {
    const score = calculateSleepScore(85.5, 450);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('calculateMetrics', () => {
  it('should return null values for empty array', () => {
    const result = calculateMetrics([]);
    expect(result.latest.acwr).toBeNull();
    expect(result.latest.strain).toBeNull();
    expect(result.averages.acwr).toBeNull();
    expect(result.averages.strain).toBeNull();
  });

  it('should calculate latest values from first item', () => {
    const trends: TrendData[] = [
      {
        date: '2026-02-08',
        acwr: 1.2,
        strain: 8.5,
        sleep_score: 85,
        hrv: 65,
        training_load: 250,
        monotony: 1.5,
      },
    ];

    const result = calculateMetrics(trends);
    expect(result.latest.acwr).toBe(1.2);
    expect(result.latest.strain).toBe(8.5);
    expect(result.latest.sleepScore).toBe(85);
    expect(result.latest.hrv).toBe(65);
    expect(result.latest.trainingLoad).toBe(250);
    expect(result.latest.monotony).toBe(1.5);
  });

  it('should calculate 7-day averages correctly', () => {
    const trends: TrendData[] = [
      { date: '2026-02-08', acwr: 1.2, strain: 8.0, sleep_score: 85, hrv: 65, training_load: 250, monotony: 1.5 },
      { date: '2026-02-07', acwr: 1.1, strain: 7.5, sleep_score: 80, hrv: 60, training_load: 240, monotony: 1.4 },
      { date: '2026-02-06', acwr: 1.3, strain: 8.5, sleep_score: 90, hrv: 70, training_load: 260, monotony: 1.6 },
      { date: '2026-02-05', acwr: 1.0, strain: 7.0, sleep_score: 75, hrv: 55, training_load: 230, monotony: 1.3 },
      { date: '2026-02-04', acwr: 1.2, strain: 8.0, sleep_score: 85, hrv: 65, training_load: 250, monotony: 1.5 },
      { date: '2026-02-03', acwr: 1.1, strain: 7.5, sleep_score: 80, hrv: 60, training_load: 240, monotony: 1.4 },
      { date: '2026-02-02', acwr: 1.3, strain: 8.5, sleep_score: 90, hrv: 70, training_load: 260, monotony: 1.6 },
    ];

    const result = calculateMetrics(trends);

    expect(result.averages.acwr).toBeCloseTo(1.17, 1);
    expect(result.averages.strain).toBeCloseTo(7.86, 1);
    expect(result.averages.sleepScore).toBeCloseTo(83.57, 1);
    expect(result.averages.hrv).toBeCloseTo(63.57, 1);
    expect(result.averages.trainingLoad).toBeCloseTo(247.14, 1);
    expect(result.averages.monotony).toBeCloseTo(1.47, 1);
  });

  it('should handle null and undefined values in trends', () => {
    const trends: TrendData[] = [
      { date: '2026-02-08', acwr: null, strain: 8.0, sleep_score: undefined, hrv: 65 },
      { date: '2026-02-07', acwr: 1.1, strain: null, sleep_score: 80, hrv: undefined },
      { date: '2026-02-06', acwr: 1.3, strain: 8.5, sleep_score: 90, hrv: 70 },
    ];

    const result = calculateMetrics(trends);

    expect(result.latest.acwr).toBeNull();
    expect(result.latest.strain).toBe(8.0);
    expect(result.latest.sleepScore).toBeNull();
    expect(result.latest.hrv).toBe(65);

    expect(result.averages.acwr).toBeCloseTo(1.2, 1);
    expect(result.averages.strain).toBeCloseTo(8.25, 1);
    expect(result.averages.sleepScore).toBe(85);
    expect(result.averages.hrv).toBeCloseTo(67.5, 1);
  });

  it('should only use first 7 days for averages', () => {
    const trends: TrendData[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-02-${10 - i}`,
      acwr: 1.0,
      strain: 7.0,
      sleep_score: 80,
      hrv: 60,
    }));

    const result = calculateMetrics(trends);

    expect(result.averages.acwr).toBe(1.0);
    expect(result.averages.strain).toBe(7.0);
  });

  it('should handle trends with fewer than 7 days', () => {
    const trends: TrendData[] = [
      { date: '2026-02-08', acwr: 1.2, strain: 8.0, sleep_score: 85, hrv: 65 },
      { date: '2026-02-07', acwr: 1.1, strain: 7.5, sleep_score: 80, hrv: 60 },
      { date: '2026-02-06', acwr: 1.3, strain: 8.5, sleep_score: 90, hrv: 70 },
    ];

    const result = calculateMetrics(trends);

    expect(result.averages.acwr).toBeCloseTo(1.2, 1);
    expect(result.averages.strain).toBeCloseTo(8.0, 1);
    expect(result.averages.sleepScore).toBeCloseTo(85, 1);
    expect(result.averages.hrv).toBeCloseTo(65, 1);
  });

  it('should handle all null values in a metric', () => {
    const trends: TrendData[] = [
      { date: '2026-02-08', acwr: null, strain: 8.0 },
      { date: '2026-02-07', acwr: null, strain: 7.5 },
      { date: '2026-02-06', acwr: null, strain: 8.5 },
    ];

    const result = calculateMetrics(trends);

    expect(result.latest.acwr).toBeNull();
    expect(result.averages.acwr).toBeNull();
    expect(result.averages.strain).toBeCloseTo(8.0, 1);
  });

  it('should handle NaN values', () => {
    const trends: TrendData[] = [
      { date: '2026-02-08', acwr: NaN, strain: 8.0, sleep_score: 85 },
      { date: '2026-02-07', acwr: 1.1, strain: NaN, sleep_score: 80 },
      { date: '2026-02-06', acwr: 1.3, strain: 8.5, sleep_score: NaN },
    ];

    const result = calculateMetrics(trends);

    expect(result.averages.acwr).toBeCloseTo(1.2, 1);
    expect(result.averages.strain).toBeCloseTo(8.25, 1);
    expect(result.averages.sleepScore).toBeCloseTo(82.5, 1);
  });
});

describe('estimateTrainingLoad', () => {
  it('should calculate training load with all activity data', () => {
    const activity = {
      fairlyActiveMinutes: 30,
      veryActiveMinutes: 20,
      averageHeartRate: 140,
    };

    const load = estimateTrainingLoad(activity);
    expect(load).toBe(700);
  });

  it('should use resting heart rate as fallback', () => {
    const activity = {
      fairlyActiveMinutes: 30,
      veryActiveMinutes: 20,
      restingHeartRate: 60,
    };

    const load = estimateTrainingLoad(activity);
    expect(load).toBe(300);
  });

  it('should use default heart rate of 70 when none provided', () => {
    const activity = {
      fairlyActiveMinutes: 30,
      veryActiveMinutes: 20,
    };

    const load = estimateTrainingLoad(activity);
    expect(load).toBe(350);
  });

  it('should return 0 for no active minutes', () => {
    const activity = {
      fairlyActiveMinutes: 0,
      veryActiveMinutes: 0,
      averageHeartRate: 140,
    };

    const load = estimateTrainingLoad(activity);
    expect(load).toBe(0);
  });

  it('should handle missing activity data', () => {
    const activity = {};
    const load = estimateTrainingLoad(activity);
    expect(load).toBe(0);
  });

  it('should handle null activity', () => {
    const load = estimateTrainingLoad(null);
    expect(load).toBe(0);
  });

  it('should handle undefined activity', () => {
    const load = estimateTrainingLoad(undefined);
    expect(load).toBe(0);
  });

  it('should only count fairly and very active minutes', () => {
    const activity = {
      lightlyActiveMinutes: 100,
      fairlyActiveMinutes: 20,
      veryActiveMinutes: 10,
      averageHeartRate: 100,
    };

    const load = estimateTrainingLoad(activity);
    expect(load).toBe(300);
  });

  it('should round to nearest integer', () => {
    const activity = {
      fairlyActiveMinutes: 33,
      veryActiveMinutes: 17,
      averageHeartRate: 141,
    };

    const load = estimateTrainingLoad(activity);
    expect(Number.isInteger(load)).toBe(true);
  });
});
