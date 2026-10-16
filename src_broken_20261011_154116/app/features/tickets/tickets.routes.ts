import { Routes } from '@angular/router';

import { environment } from '@env/environment';

import { TicketsStore } from './tickets.store';

const titleSuffix = environment.appName;

export const TICKETS_ROUTES: Routes = [
  {
    path: '',
    providers: [TicketsStore],
    children: [
      {
        path: '',
        loadComponent: () => import('./ticket-lists/ticket-lists'),
        title: `Tickets | ${titleSuffix}`,
      },
      {
        path: 'classifications',
        loadComponent: () => import('./ticket-classification/ticket-classification'),
        title: `Ticket Classifications | ${titleSuffix}`,
      },
      {
        path: 'headers',
        loadComponent: () => import('./ticket-header/ticket-header'),
        title: `Ticket Headers | ${titleSuffix}`,
      },
      {
        path: 'types',
        loadComponent: () => import('./ticket-type/ticket-type'),
        title: `Ticket Types | ${titleSuffix}`,
      },
      {
        path: 'support-teams',
        loadComponent: () => import('./ticket-agents/ticket-agents'),
        title: `Support Teams | ${titleSuffix}`,
      },
      {
        path: ':id',
        loadComponent: () => import('./ticket-details/ticket-details'),
        title: 'Ticket detail',
      },
    ],
  },
];
