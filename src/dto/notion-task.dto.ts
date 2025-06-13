export class NotionTaskDto {
  title: string;
  project: string;
  assignee: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  taskType: string[];
  worklogRequired: boolean; // ✅ 추가
}