import { AgentTask, TaskResult } from '@/types/chat';

export const TimerTask: AgentTask = {
    name: 'timer',
    description: 'Get current time or set reminders',
    parameters: {
        action: 'string - "get_time" or "set_reminder"',
        duration: 'number - duration in seconds (for reminders)',
    },

    async execute(params: { action: string; duration?: number }): Promise<TaskResult> {
        try {
            if (params.action === 'get_time') {
                const now = new Date();
                return {
                    success: true,
                    data: {
                        time: now.toLocaleTimeString(),
                        date: now.toLocaleDateString(),
                        timestamp: now.getTime(),
                    },
                };
            }

            if (params.action === 'set_reminder' && params.duration) {
                // In a real implementation, this would set a notification
                return {
                    success: true,
                    data: {
                        message: `Reminder set for ${params.duration} seconds from now`,
                        duration: params.duration,
                    },
                };
            }

            return {
                success: false,
                error: 'Invalid action or missing parameters',
            };
        } catch (error) {
            return {
                success: false,
                error: 'Timer task failed',
            };
        }
    },
};
