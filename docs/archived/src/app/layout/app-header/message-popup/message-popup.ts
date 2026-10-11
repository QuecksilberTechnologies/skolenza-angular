import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Common } from '@core/services';
import { LoginInfo, Message } from '@shared/interfaces';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

@Component({
  selector: 'app-message-popup',
  imports: [
    ButtonModule,
    // TitleCasePipe,
    FormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    NgOptimizedImage,
  ],
  templateUrl: './message-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MessagePopup implements OnInit {
  readonly closePopup = output();
  unreadMessageCount = input(0);
  #cd = inject(ChangeDetectorRef);
  #commonService = inject(Common);
  activeCategory = 'all';
  searchQuery = '';

  messages: Message[] = [
    {
      id: 1,
      sender: {
        id: 1,
        name: 'Sarah Johnson',
        avatar: 'men.jpg',
        status: 'online',
        role: 'Project Manager',
      },
      content: "Hey! I've updated the project timeline. Can you review it when you get a chance?",
      time: '2m ago',
      isRead: false,
      type: 'text',
      category: 'project',
      priority: 'high',
      reactions: [
        { emoji: '👍', count: 2, users: ['Mike', 'John'] },
        { emoji: '🎉', count: 1, users: ['Alice'] },
      ],
    },
    {
      id: 2,
      sender: {
        id: 2,
        name: 'Mike Smith',
        avatar: 'men.jpg',
        status: 'away',
        role: 'Design Lead',
      },
      content: "Here's the latest design mockup for the dashboard",
      time: '15m ago',
      isRead: true,
      type: 'image',
      category: 'direct',
      attachments: [
        {
          type: 'image',
          name: 'dashboard-mockup.png',
          url: 'assets/images/dashboard-mockup.png',
          thumbnail: 'assets/images/dashboard-mockup-thumb.png',
        },
      ],
    },
    {
      id: 3,
      sender: {
        id: 3,
        name: 'Emily Chen',
        avatar: 'men.jpg',
        status: 'offline',
        role: 'Finance Manager',
      },
      content:
        "I've attached the Q4 report. Please review and let me know if you need any changes.",
      time: '1h ago',
      isRead: true,
      type: 'file',
      category: 'announcement',
      priority: 'medium',
      attachments: [
        {
          type: 'file',
          name: 'Q4-Report-2024.pdf',
          url: 'assets/documents/Q4-Report-2024.pdf',
          size: '2.4 MB',
        },
      ],
    },
    {
      id: 4,
      sender: {
        id: 4,
        name: 'Development Team',
        avatar: 'men.jpg',
        status: 'online',
        role: 'Team',
      },
      content: 'New features deployed to production! Check out the changelog for details.',
      time: '3h ago',
      isRead: false,
      type: 'text',
      category: 'group',
      priority: 'high',
      reactions: [{ emoji: '🚀', count: 5, users: ['Team'] }],
    },
  ];

  async ngOnInit() {
    const loginInfo: LoginInfo = await this.#commonService.getLoginInfo();
    if (loginInfo?.commonItems) {
      console.log('✉️ Message:', loginInfo.commonItems[0]?.children[0]);
    } else {
      console.warn('✉️ commonItems is undefined');
    }
  }

  markAllMessagesAsRead() {
    this.messages = this.messages.map((message) => ({
      ...message,
      isRead: true,
    }));
    this.#cd.markForCheck();
  }

  get filteredMessages(): Message[] {
    return this.messages.filter((message) => {
      const matchesSearch =
        this.searchQuery === '' ||
        message.content.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        message.sender.name.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory =
        this.activeCategory === 'all' || message.category === this.activeCategory;

      return matchesSearch && matchesCategory;
    });
  }

  setCategory(category: string) {
    this.activeCategory = category;
    this.#cd.markForCheck();
  }

  onAppClick(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.closePopup.emit();
  }
}
