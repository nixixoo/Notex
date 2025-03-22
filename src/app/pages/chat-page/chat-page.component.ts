import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from '../../components/chat/chat.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  template: `
    <div class="chat-page">
      <app-chat></app-chat>
    </div>
  `,
  styles: [`
    .chat-page {
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
    }
  `]
})
export class ChatPageComponent { }
