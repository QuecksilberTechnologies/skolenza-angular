import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Common, StorageApi } from '@core/services';
import { KnowledgeArticle } from '@shared/interfaces';

import { KnowledgeStore } from './knowledge.store';

const article = (id: string, over: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id,
  title: `Article ${id}`,
  category: 'HR',
  summary: 'summary',
  content: '# body',
  author: 'A',
  updatedAt: '2026-06-01',
  popular: false,
  attachments: [],
  ...over,
});

const ARTICLES: KnowledgeArticle[] = [
  article('1', { category: 'HR', title: 'Remote Work', popular: true }),
  article('2', { category: 'Engineering', title: 'Git Strategy' }),
  article('3', { category: 'Security', title: 'Incident Response', popular: true }),
];

const RESPONSE = {
  isSucceeded: true,
  message: '',
  errors: [],
  pageNumber: 1,
  pageSize: 3,
  totalRecords: 3,
  totalPages: 1,
  data: ARTICLES,
};

describe('KnowledgeStore', () => {
  let store: InstanceType<typeof KnowledgeStore>;
  let http: HttpTestingController;
  let setItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setItem = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        KnowledgeStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StorageApi, useValue: { getItem: vi.fn().mockResolvedValue(null), setItem } },
      ],
    });
    store = TestBed.inject(KnowledgeStore);
    TestBed.tick();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('data/learning/knowledge.json').flush(RESPONSE);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('loads articles and categories', () => {
    expect(store.articles().length).toBe(3);
    expect(store.categories()).toEqual(['Engineering', 'HR', 'Security']);
  });

  it('exposes popular articles', () => {
    expect(store.popular().map((a) => a.id)).toEqual(['1', '3']);
  });

  it('filters by category', () => {
    store.setCategory('Security');
    expect(store.filteredArticles().map((a) => a.id)).toEqual(['3']);
  });

  it('filters by search across title and summary', () => {
    store.setSearch('git');
    expect(store.filteredArticles().map((a) => a.id)).toEqual(['2']);
  });

  it('selects an article', () => {
    store.select('2');
    expect(store.selectedArticle()?.title).toBe('Git Strategy');
  });

  it('toggles and persists bookmarks', () => {
    expect(store.isBookmarked('1')).toBe(false);
    store.toggleBookmark('1');
    expect(store.isBookmarked('1')).toBe(true);
    expect(setItem).toHaveBeenCalledWith('learning-bookmarks', ['1']);
    store.toggleBookmark('1');
    expect(store.isBookmarked('1')).toBe(false);
  });
});
