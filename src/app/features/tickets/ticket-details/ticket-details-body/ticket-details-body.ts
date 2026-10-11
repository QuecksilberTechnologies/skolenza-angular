import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { ITicketDetail } from '../../models';
import { TicketConversation } from '../ticket-conversation/ticket-conversation';
import { TicketReplyInput } from '../ticket-reply-input/ticket-reply-input';

@Component({
  selector: 'app-ticket-details-body',
  imports: [DatePipe, TooltipModule, TicketConversation, TicketReplyInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-details-body.html',
  host: {
    class: 'flex flex-col lg:flex-1 lg:min-h-0',
  },
})
export class TicketDetailsBody {
  readonly detail = input.required<ITicketDetail>();

  protected attachmentVisual(fileName: string): { icon: string; tile: string; iconColor: string } {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return {
        icon: 'pi pi-image',
        tile: 'bg-sky-50 dark:bg-sky-900/20',
        iconColor: 'text-sky-600 dark:text-sky-400',
      };
    }
    if (ext === 'pdf') {
      return {
        icon: 'pi pi-file-pdf',
        tile: 'bg-red-50 dark:bg-red-900/20',
        iconColor: 'text-red-600 dark:text-red-400',
      };
    }
    if (['doc', 'docx'].includes(ext)) {
      return {
        icon: 'pi pi-file-word',
        tile: 'bg-blue-50 dark:bg-blue-900/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        icon: 'pi pi-file-excel',
        tile: 'bg-emerald-50 dark:bg-emerald-900/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return {
        icon: 'pi pi-folder',
        tile: 'bg-amber-50 dark:bg-amber-900/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) {
      return {
        icon: 'pi pi-video',
        tile: 'bg-purple-50 dark:bg-purple-900/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
      };
    }
    return {
      icon: 'pi pi-file',
      tile: 'bg-zinc-100 dark:bg-zinc-800',
      iconColor: 'text-zinc-500 dark:text-zinc-400',
    };
  }
}
