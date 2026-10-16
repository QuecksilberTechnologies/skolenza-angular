import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'search',
})
export class SearchPipe implements PipeTransform {
  transform<T>(items: readonly T[] | null, searchText: string | null, keys: (keyof T)[]): T[] {
    if (!items || !searchText?.trim() || !keys?.length) {
      return Array.isArray(items) ? [...items] : [];
    }

    const term = searchText.toLowerCase();
    return items.filter((item) =>
      keys.some((key) =>
        String(item[key] ?? '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }
}
