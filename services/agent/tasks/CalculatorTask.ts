import { AgentTask, TaskResult } from '@/types/chat';

export const CalculatorTask: AgentTask = {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    parameters: {
        expression: 'string - mathematical expression to evaluate',
    },

    async execute(params: { expression: string }): Promise<TaskResult> {
        try {
            // Simple safe evaluation (only allows numbers and basic operators)
            const sanitized = params.expression.replace(/[^0-9+\-*/().]/g, '');

            if (!sanitized) {
                return {
                    success: false,
                    error: 'Invalid expression',
                };
            }

            // Use Function constructor for safe evaluation
            const result = Function(`'use strict'; return (${sanitized})`)();

            return {
                success: true,
                data: {
                    expression: params.expression,
                    result: result,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: 'Calculation failed',
            };
        }
    },
};
