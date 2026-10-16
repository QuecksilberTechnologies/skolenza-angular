import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-profile-document-block',
  imports: [],
  templateUrl: './profile-document-block.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDocumentBlock {
  readonly label = input<string>();
  readonly fileType = input<string | number>();
  readonly fileName = input<string>();
  readonly filePath = input<string>();

  // The API sends `fileType` as an int; older consumers type it as a string.
  protected readonly isPdf = computed(() => String(this.fileType()) === '2');
}
