import { tool } from 'ai'
import { z } from 'zod'

export const activityTools = {
  renameActivity: tool({
    description: 'Rename the activity. Use when the user wants to change the activity name.',
    inputSchema: z.object({
      name: z.string().describe('The new name for the activity'),
    }),
  }),

  renameLap: tool({
    description:
      'Rename a specific lap. Use the lap ID from the activity context to identify the lap.',
    inputSchema: z.object({
      lapId: z.string().describe('The ID of the lap to rename'),
      name: z.string().describe('The new name for the lap'),
    }),
  }),

  splitLap: tool({
    description:
      'Split a lap into multiple equal parts by distributing trackpoints evenly. The resulting laps will be numbered sequentially.',
    inputSchema: z.object({
      lapId: z.string().describe('The ID of the lap to split'),
      parts: z.number().int().min(2).max(20).describe('Number of equal parts to split into (2-20)'),
    }),
  }),

  mergeLaps: tool({
    description:
      'Merge two consecutive laps into one. The laps must be adjacent in the activity. The merged lap name combines both original names.',
    inputSchema: z.object({
      lapId1: z.string().describe('The ID of the first lap'),
      lapId2: z.string().describe('The ID of the second (adjacent) lap'),
    }),
  }),

  getLapDetails: tool({
    description:
      'Get detailed statistics for all laps. Returns full data including pace, heart rate, cadence, power, speed, calories, elevation gain/loss, and point count. Use this when the user asks analytical questions like "which lap was fastest", "compare my laps", or "summarize my stats".',
    inputSchema: z.object({}),
  }),

  getColumns: tool({
    description:
      'Get the current column configuration: which built-in columns are visible/hidden and which custom columns are active on this activity. Use this before modifying columns to understand the current state.',
    inputSchema: z.object({}),
  }),

  toggleBuiltinColumn: tool({
    description:
      'Show or hide a built-in column in the lap table. Use the column key from the columns context.',
    inputSchema: z.object({
      columnKey: z
        .enum([
          'distance',
          'duration',
          'pace',
          'avgHr',
          'maxHr',
          'avgCadence',
          'avgPower',
          'maxSpeed',
          'calories',
          'elevationGain',
          'elevationLoss',
          'pointCount',
        ])
        .describe('The column key to toggle'),
      visible: z.boolean().describe('Whether the column should be visible'),
    }),
  }),

  addCustomColumn: tool({
    description:
      'Create a new custom column and add it to this activity. Manual columns let the user enter a number per lap. Computed columns use a formula with two operands and an operator.',
    inputSchema: z.object({
      name: z.string().describe('Name for the new column'),
      type: z
        .enum(['manual', 'computed'])
        .describe('manual = user-entered values, computed = formula-based'),
      formula: z
        .object({
          operator: z
            .enum(['divide', 'multiply', 'add', 'subtract', 'divideby'])
            .describe('divide = A/B, divideby = B/A, multiply = A×B, add = A+B, subtract = A−B'),
          left: z
            .string()
            .describe(
              'Left operand: a built-in stat key (distance, duration, avgHr, maxHr, avgCadence, avgPower, maxSpeed, calories, elevationGain, elevationLoss) or a manual custom column name',
            ),
          right: z
            .string()
            .describe('Right operand: a built-in stat key or a manual custom column name'),
        })
        .optional()
        .describe('Required for computed columns'),
    }),
  }),

  removeCustomColumn: tool({
    description:
      'Remove a custom column from this activity. This unlinks it but does not permanently delete the column definition.',
    inputSchema: z.object({
      columnName: z.string().describe('Name of the custom column to remove'),
    }),
  }),

  setCustomColumnValue: tool({
    description:
      'Set a numeric value for a manual custom column on a specific lap. Use the lap ID from the activity context.',
    inputSchema: z.object({
      columnName: z.string().describe('Name of the manual custom column'),
      lapId: z.string().describe('The ID of the lap'),
      value: z.number().describe('The numeric value to set'),
    }),
  }),
}
