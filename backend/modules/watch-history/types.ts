export interface IWatchHistory {
  id?: string;
  studentId: string;
  videoId: string;
  watchedSeconds: number;
  completed: boolean;
  lastPosition: number;
  updatedAt: string;
}
