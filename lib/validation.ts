import { z } from 'zod';

export const priorityEnum = z.enum(['high', 'medium', 'low']);
export const recurrencePatternEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const reminderMinutesEnum = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
  z.literal(120),
  z.literal(1440),
  z.literal(2880),
  z.literal(10080),
]);
