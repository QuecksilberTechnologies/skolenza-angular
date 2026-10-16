import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ProfileDocument {
  fileName?: string;
  filePath?: string;
  documentTypeName?: string;
}

@Component({
  selector: 'app-profile-document-list',
  imports: [],
  templateUrl: './profile-document-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDocumentList {
  readonly label = input<string>('Documents');
  readonly documents = input<ProfileDocument[]>([]);
}
