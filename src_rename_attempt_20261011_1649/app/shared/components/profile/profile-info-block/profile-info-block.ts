import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const SCRAMBLE_TICK_MS = 40;

@Component({
  selector: 'app-profile-info-block',
  imports: [NgOptimizedImage, ButtonModule, SkeletonModule],
  templateUrl: './profile-info-block.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfoBlock {
  readonly label = input<string>();
  readonly value = input<string | number | null>();
  /** Renders the value as a link, e.g. `tel:` or `mailto:`. */
  readonly href = input<string>();
  /** Decorative logo shown before the value, e.g. a bank or UPI mark. Hidden when there is no value. */
  readonly logoSrc = input<string | null>();
  readonly loading = input<boolean>(false);
  readonly isMask = input<boolean>(false);
  /** True while the value is revealed - despite the name, which callers already depend on. */
  readonly isMasked = input<boolean>();
  readonly toggleMask = output();
  /** Gates the decode animation so masked values don't animate on first render. */
  readonly #hasToggled = signal(false);
  /** Left part of a masked value that has finished decoding. */
  protected readonly settledText = signal('');
  /** Right part still cycling random glyphs; empty once the decode finishes. */
  protected readonly scramblingText = signal('');
  #frame = 0;

  constructor() {
    effect(() => {
      const next = String(this.value() ?? '');
      untracked(() => {
        if (this.#hasToggled() && this.isMask() && this.#canAnimate()) {
          this.#scramble(next);
        } else {
          this.#show(next);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.#stop());
  }

  onToggleMask() {
    this.#hasToggled.set(true);
    this.toggleMask.emit();
  }

  #scramble(target: string) {
    this.#stop();
    const duration = Math.min(600, 200 + target.length * 25);
    const start = performance.now();
    let lastTick = -SCRAMBLE_TICK_MS;

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        this.#show(target);
        return;
      }
      if (elapsed - lastTick >= SCRAMBLE_TICK_MS) {
        lastTick = elapsed;
        const settled = Math.floor((elapsed / duration) * target.length);
        this.settledText.set(target.slice(0, settled));
        this.scramblingText.set(randomGlyphs(target.slice(settled)));
      }
      this.#frame = requestAnimationFrame(step);
    };
    this.#frame = requestAnimationFrame(step);
  }

  #show(text: string) {
    this.#stop();
    this.settledText.set(text);
    this.scramblingText.set('');
  }

  #stop() {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #canAnimate(): boolean {
    return (
      typeof requestAnimationFrame !== 'undefined' &&
      typeof matchMedia !== 'undefined' &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}

/**
 * Swaps each character for a random one of the same class so the value keeps its width
 * while it decodes: digits stay tabular, letters keep their case.
 */
function randomGlyphs(source: string): string {
  let out = '';
  for (const char of source) {
    const pool = /\d/.test(char)
      ? DIGITS
      : /[A-Z]/.test(char)
        ? UPPER
        : /[a-z]/.test(char)
          ? LOWER
          : DIGITS;
    out += pool[Math.floor(Math.random() * pool.length)];
  }
  return out;
}
