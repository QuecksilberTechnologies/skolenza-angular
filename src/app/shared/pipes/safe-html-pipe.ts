import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
})
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * SECURITY: Only pipe trusted, application-controlled HTML through this pipe.
   * Never pipe user-submitted content — it bypasses Angular's XSS protection.
   * Angular's sanitizer is applied first to strip dangerous tags/attributes before
   * bypassing the security trust check.
   */
  transform(value: string): SafeHtml {
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, value) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
}
