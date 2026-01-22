import { AgentTask, TaskResult } from '@/types/chat';

class AgentExecutor {
    private tasks: Map<string, AgentTask> = new Map();

    registerTask(task: AgentTask) {
        this.tasks.set(task.name, task);
        console.log(`Registered task: ${task.name}`);
    }

    async executeTask(taskName: string, params: any): Promise<TaskResult> {
        const task = this.tasks.get(taskName);

        if (!task) {
            return {
                success: false,
                error: `Task "${taskName}" not found`,
            };
        }

        try {
            const result = await task.execute(params);
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Task execution failed',
            };
        }
    }

    parseTaskFromText(text: string): { taskName: string; params: any } | null {
        // Simple JSON extraction for task commands
        // Format: {"task": "taskName", "params": {...}}
        try {
            const jsonMatch = text.match(/\{[\s\S]*"task"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    taskName: parsed.task,
                    params: parsed.params || {},
                };
            }
        } catch (error) {
            console.error('Failed to parse task:', error);
        }

        return null;
    }

    getAvailableTasks(): AgentTask[] {
        return Array.from(this.tasks.values());
    }

    getTaskDescription(taskName: string): string | null {
        const task = this.tasks.get(taskName);
        return task ? task.description : null;
    }
}

export const agentExecutor = new AgentExecutor();
