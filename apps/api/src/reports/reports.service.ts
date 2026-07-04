import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { InternsService } from '../interns/interns.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly internsService: InternsService,
  ) {}

  async getSummary() {
    const [taskStats, internStats, statusDist, internProgress] = await Promise.all([
      this.tasksService.getDashboardStats(),
      this.internsService.getStats(),
      this.tasksService.getStatusDistribution(),
      this.tasksService.getInternProgress(),
    ]);

    const topPerformer = internProgress[0];

    return {
      totalInterns: internStats.total,
      completedTasks: taskStats.completed,
      averageProgress: taskStats.averageProgress,
      overdueTaskCount: taskStats.delayed,
      topPerformer: topPerformer
        ? { name: topPerformer.name, progress: Math.round(parseFloat(topPerformer.progress)) }
        : null,
      taskStatusDistribution: statusDist,
    };
  }

  async getPerformanceReport() {
    return this.tasksService.getInternProgress();
  }

  async getCompletionTrend() {
    return this.tasksService.getCompletionTrend();
  }

  async getDepartmentTaskDistribution() {
    return this.internsService.getDepartmentDistribution();
  }
}
