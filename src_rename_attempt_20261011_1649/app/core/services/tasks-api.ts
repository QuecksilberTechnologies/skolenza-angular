import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of } from 'rxjs';

import {
  GetTaskMetaResponse,
  GetTaskResponse,
  GetTasksResponse,
  Task,
  TaskApiResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * Task Sheet API.
 *
 * MOCK-ONLY: reads static JSON from `data/tasks/*.json` (mirrors LearningApi).
 * Mutations echo the payload via `of()` with no persistence.
 * TODO: API — swap each method for real HTTP against the Task backend.
 */
@Injectable({ providedIn: 'root' })
export class TasksApi extends BaseService {
  readonly #http = inject(HttpClient);
  readonly #mockLatency = 300;

  getTasks(): Observable<GetTasksResponse> {
    // Filtering/paging is applied client-side in the store against the full mock set.
    return this.#http
      .get<GetTasksResponse>('data/tasks/tasks.json')
      .pipe(catchError(this.handleError<GetTasksResponse>('getTasks')));
  }

  getTaskById(id: string): Observable<GetTaskResponse> {
    return this.getTasks().pipe(
      map((res) => {
        const task = res.data.find((t) => t.id === id) ?? null;
        return this.#ok(task as Task, task ? 'Task loaded' : 'Task not found');
      }),
      catchError(this.handleError<GetTaskResponse>('getTaskById')),
    );
  }

  getTaskMeta(): Observable<GetTaskMetaResponse> {
    return this.#http
      .get<GetTaskMetaResponse>('data/tasks/task-meta.json')
      .pipe(catchError(this.handleError<GetTaskMetaResponse>('getTaskMeta')));
  }

  createTask(task: Task): Observable<GetTaskResponse> {
    // TODO: API — POST /tasks
    return of(this.#ok(task, 'Task created')).pipe(delay(this.#mockLatency));
  }

  updateTask(task: Task): Observable<GetTaskResponse> {
    // TODO: API — PUT /tasks/{id}
    return of(this.#ok(task, 'Task updated')).pipe(delay(this.#mockLatency));
  }

  deleteTask(id: string): Observable<TaskApiResponse<string>> {
    // TODO: API — DELETE /tasks/{id}
    return of(this.#ok(id, 'Task deleted')).pipe(delay(this.#mockLatency));
  }

  changeStatus(task: Task): Observable<GetTaskResponse> {
    // TODO: API — PATCH /tasks/{id}/status
    return of(this.#ok(task, 'Status updated')).pipe(delay(this.#mockLatency));
  }

  changeProgress(task: Task): Observable<GetTaskResponse> {
    // TODO: API — PATCH /tasks/{id}/progress
    return of(this.#ok(task, 'Progress updated')).pipe(delay(this.#mockLatency));
  }

  addComment(task: Task): Observable<GetTaskResponse> {
    // TODO: API — POST /tasks/{id}/comments
    return of(this.#ok(task, 'Comment added')).pipe(delay(this.#mockLatency));
  }

  uploadAttachment(task: Task): Observable<GetTaskResponse> {
    // TODO: API — POST /tasks/{id}/attachments
    return of(this.#ok(task, 'Attachment uploaded')).pipe(delay(this.#mockLatency));
  }

  #ok<T>(data: T, message: string): TaskApiResponse<T> {
    return {
      isSucceeded: true,
      message,
      errors: [],
      data,
      pageNumber: 1,
      pageSize: 1,
      totalRecords: 1,
      totalPages: 1,
    };
  }
}
