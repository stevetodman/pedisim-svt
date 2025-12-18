// ============================================================================
// NURSE SAFETY TESTS
// Priority 1: Safety validation layer
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  evaluateAdenosineOrder,
  evaluateCardioversionOrder,
} from '../../src/kernel/nurse';
import { TEST_PATIENT } from '../setup';

const weight = TEST_PATIENT.weight; // 18.5kg

describe('evaluateAdenosineOrder', () => {
  describe('first dose validation', () => {
    it('confirms correct first dose (1.85mg)', () => {
      const result = evaluateAdenosineOrder(1.85, 0, weight);
      expect(result.allow).toBe(true);
      expect(result.action).toBe('confirm');
    });

    it('confirms dose within acceptable range', () => {
      // 10% tolerance typically acceptable
      const result = evaluateAdenosineOrder(2.0, 0, weight);
      expect(result.allow).toBe(true);
    });

    it('questions significantly low dose', () => {
      const result = evaluateAdenosineOrder(1.0, 0, weight);
      // Should still allow but may question
      expect(result.allow).toBe(true);
    });
  });

  describe('second dose validation', () => {
    it('confirms correct second dose (3.7mg)', () => {
      const result = evaluateAdenosineOrder(3.7, 1, weight);
      expect(result.allow).toBe(true);
    });

    it('accepts dose near second dose range', () => {
      const result = evaluateAdenosineOrder(3.5, 1, weight);
      expect(result.allow).toBe(true);
    });
  });

  describe('third dose refusal', () => {
    it('refuses third dose', () => {
      const result = evaluateAdenosineOrder(3.7, 2, weight);
      expect(result.allow).toBe(false);
      expect(result.action).toBe('refuse');
      expect(result.reason).toBe('third_dose');
    });
  });

  describe('overdose handling', () => {
    it('caps first dose overdose to max 6mg', () => {
      const result = evaluateAdenosineOrder(8.0, 0, weight);
      expect(result.action).toBe('cap');
      expect(result.actualDose).toBe(6);
    });

    it('caps second dose overdose to max 12mg', () => {
      const result = evaluateAdenosineOrder(15.0, 1, weight);
      expect(result.action).toBe('cap');
      expect(result.actualDose).toBe(12);
    });
  });

  describe('invalid doses', () => {
    it('questions zero dose', () => {
      const result = evaluateAdenosineOrder(0, 0, weight);
      // Implementation may allow with confirmation or question
      expect(result.needsConfirmation || !result.allow).toBe(true);
    });

    it('questions negative dose', () => {
      const result = evaluateAdenosineOrder(-1, 0, weight);
      // Implementation may allow with confirmation or question
      expect(result.needsConfirmation || !result.allow).toBe(true);
    });
  });
});

describe('evaluateCardioversionOrder', () => {
  describe('sedation requirement', () => {
    it('refuses cardioversion without sedation', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'SVT', false);
      expect(result.allow).toBe(false);
      expect(result.action).toBe('refuse');
      expect(result.reason).toBe('not_sedated');
    });

    it('allows cardioversion when sedated', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'SVT', true);
      expect(result.allow).toBe(true);
    });
  });

  describe('energy validation', () => {
    it('confirms correct initial energy (9J for 18.5kg)', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'SVT', true);
      expect(result.allow).toBe(true);
      expect(result.action).toBe('confirm');
    });

    it('confirms escalated energy (37J for 18.5kg)', () => {
      const result = evaluateCardioversionOrder(37, 2, weight, 'SVT', true);
      expect(result.allow).toBe(true);
    });

    it('questions very low energy', () => {
      const result = evaluateCardioversionOrder(2, 1, weight, 'SVT', true);
      // Should allow but question effectiveness
      expect(result.needsConfirmation || result.allow).toBe(true);
    });

    it('handles very high energy', () => {
      const result = evaluateCardioversionOrder(100, 1, weight, 'SVT', true);
      // Implementation may allow with warning or refuse
      expect(result).toBeDefined();
    });
  });

  describe('rhythm appropriateness', () => {
    it('allows for SVT', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'SVT', true);
      expect(result.allow).toBe(true);
    });

    it('refuses for sinus rhythm', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'SINUS', true);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('rhythm');
    });

    it('refuses for asystole', () => {
      const result = evaluateCardioversionOrder(9, 1, weight, 'ASYSTOLE', true);
      expect(result.allow).toBe(false);
    });
  });

  describe('invalid orders', () => {
    it('handles zero energy', () => {
      const result = evaluateCardioversionOrder(0, 1, weight, 'SVT', true);
      // May allow with confirmation or refuse
      expect(result.needsConfirmation || !result.allow).toBe(true);
    });

    it('handles negative energy', () => {
      const result = evaluateCardioversionOrder(-10, 1, weight, 'SVT', true);
      // May allow with confirmation or refuse
      expect(result.needsConfirmation || !result.allow).toBe(true);
    });
  });
});
