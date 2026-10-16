import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadComponent: () => import('./project-overview/project-overview.component'),
    title: 'Project Overview | Projects',
  },
  {
    path: 'list',
    loadComponent: () => import('./list-view/list-view.component'),
    title: 'List View | Projects',
  },
  {
    path: 'board',
    loadComponent: () => import('./kanban-view/kanban-view.component'),
    title: 'Board View | Projects',
  },
  {
    path: 'schedule',
    loadComponent: () => import('./project-schedule/project-schedule.component'),
    title: 'Project Schedule | Projects',
  },
  {
    path: 'timeline',
    loadComponent: () => import('./gantt-view/gantt-view.component'),
    title: 'Gantt View | Projects',
  },
];
