import { DOCUMENT, effect, inject, Injectable } from '@angular/core';

import { InstitutionsApi } from './institutions-api';

const DEFAULT_FAVICON_HREF = 'favicon.ico';
const DEFAULT_FAVICON_TYPE = 'image/x-icon';

@Injectable({
  providedIn: 'root',
})
export class FaviconApi {
  readonly #document = inject(DOCUMENT);
  readonly #institutionsApi = inject(InstitutionsApi);

  constructor() {
    this.#institutionsApi.loadBrandLogos();
    effect(() => {
      this.#applyFavicon(this.#institutionsApi.brandLogos().favicon);
    });
  }

  #applyFavicon(dataUrl: string | null) {
    const link = this.#getOrCreateLink();
    if (dataUrl) {
      link.setAttribute('href', dataUrl);
      link.removeAttribute('type');
    } else {
      link.setAttribute('href', DEFAULT_FAVICON_HREF);
      link.setAttribute('type', DEFAULT_FAVICON_TYPE);
    }
  }

  #getOrCreateLink(): HTMLLinkElement {
    let link = this.#document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = this.#document.createElement('link');
      link.setAttribute('rel', 'icon');
      this.#document.head.appendChild(link);
    }
    return link;
  }
}
