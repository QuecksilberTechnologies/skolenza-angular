import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import { GetProjectsRes, GetScheduleRes, Project, ProjectTask } from '@shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class ProjectsApi {
  readonly #http = inject(HttpClient);
  readonly currentView = signal<string>('dayGridMonth');
  readonly currentTitle = signal<string>('');
  readonly projects = signal<Project[]>([]);

  getProjects() {
    return this.projects();
  }

  setProjects(data: Project[]) {
    this.projects.set([...data]);
  }

  getProjectsByStatus(status: Project['status']) {
    return this.projects().filter((project) => project.status === status);
  }

  getProjectsByPriority(priority: Project['priority']) {
    return this.projects().filter((project) => project.priority === priority);
  }

  addProject(project: Project): Project {
    const newProject: Project = {
      ...project,
      id: this.projects().length + 1,
    };

    this.projects.update((projects) => [...projects, newProject]);
    return newProject;
  }

  updateProject(projectId: number, updates: Project) {
    this.projects.update((projects) =>
      projects.map((project) => {
        if (project.id === projectId) {
          if (updates.status === 'completed') {
            updates.progress = 100;
          }
          return { ...project, ...updates };
        }
        return project;
      }),
    );
  }

  deleteProject(projectId: number) {
    this.projects.update((projects) => projects.filter((project) => project.id !== projectId));
  }

  // View state (shared by the Project Schedule calendar)
  getCurrentView() {
    return this.currentView;
  }

  getCurrentTitle() {
    return this.currentTitle;
  }

  setCurrentView(view: string) {
    this.currentView.set(view);
  }

  setCurrentTitle(title: string) {
    this.currentTitle.set(title);
  }

  fetchProjects(): Observable<GetProjectsRes> {
    return this.#http.get<GetProjectsRes>('data/projects.json').pipe(catchError(this.handleError));
  }

  fetchProjectTasks(): Observable<ProjectTask[]> {
    return this.#http
      .get<ProjectTask[]>('data/project-tasks.json')
      .pipe(catchError(this.handleError));
  }

  fetchSchedule(): Observable<GetScheduleRes> {
    return this.#http
      .get<GetScheduleRes>('data/project-schedule.json')
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
