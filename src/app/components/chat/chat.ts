import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  viewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ChatService } from '../../services/chat';
import { ChatMessage } from '../../models/chat';
import { User } from '../../models/user';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  // Referencia al contenedor de mensajes para hacer scroll automático (Angular v20 viewChild)
  messagesContainer = viewChild('messagesContainer', { read: ElementRef });
  messageInput = viewChild('messageInput', { read: ElementRef });

  user: User | null = null; // Información del usuario actual
  messages: ChatMessage[] = []; // Lista de mensajes del chat
  messageText = ''; // Texto que está escribiendo el usuario
  sendingMessage = false; // Indica si se está enviando un mensaje
  assistantTyping = false; // Indica si el asistente está generando una respuesta
  loadingHistory = false; // Indica si se está cargando el historial
  errorMessage = ''; // Mensaje de error para mostrar al usuario

  private subscriptions: Subscription[] = [];

  // Control para hacer scroll automático
  private shouldScroll = false;

  async ngOnInit(): Promise<void> {
    try {
      await this.verifyAuthentication();
      await this.initializeChat();
      this.configureSubscriptions();
    } catch (error) {
      console.error('❌ Error al inicializar el chat:', error);
      this.errorMessage = 'Error al cargar el chat. Intenta recargar la página.';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Se ejecuta después de que Angular actualiza la vista
   * Lo usamos para hacer scroll automático cuando hay nuevos mensajes
   */
  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private async verifyAuthentication(): Promise<void> {
    this.user = this.authService.getCurrentUser();

    // Simulación de usuario autenticado para desarrollo
    /* this.user = {
      uid: 'usuario123',
      name: 'Usuario de Prueba',
      photoUrl: '',
      email: 'usuario@ejemplo.com',
      creationDate: new Date(),
      lastConnection: new Date(),
    }; */

    if (!this.user) {
      await this.router.navigate(['/auth']);
      throw new Error('User not authenticated');
    }
  }

  private async initializeChat(): Promise<void> {
    if (!this.user) return;

    this.loadingHistory = true;

    try {
      // Inicializamos el chat con el ID del usuario
      // await this.chatService.initializeChat(this.user.uid);
    } catch (error) {
      console.error('❌ Error initializing chat in component:', error);
      throw error;
    } finally {
      this.loadingHistory = false;
    }
  }

  private configureSubscriptions(): void {
    // Suscribirse a los mensajes del chat
    // const subMessages = this.chatService.messages$.subscribe(messages => {
    //   this.messages = messages;
    //   this.shouldScroll = true;
    // });
    // // Suscribirse al estado del asistente
    // const subAssistant = this.chatService.assistantResponding$.subscribe(isResponding => {
    //   this.assistantTyping = isResponding;
    //   if (isResponding) {
    //     this.shouldScroll = true;
    //   }
    // });
    // this.subscriptions.push(subMessages, subAssistant);
  }

  async sendMessage(): Promise<void> {
    // Validamos que hay texto para enviar
    if (!this.messageText.trim()) {
      return;
    }

    // Limpiamos errores previos
    this.errorMessage = '';
    this.sendingMessage = true;

    // Guardamos el texto del mensaje y limpiamos el input
    const text = this.messageText.trim();
    this.messageText = '';

    try {
      // Enviamos el mensaje usando el servicio de chat
      // await this.chatService.sendMessage(text);

      // Hacemos focus en el input para continuar escribiendo
      this.focusInput();
    } catch (error: any) {
      console.error('❌ Error al enviar mensaje:', error);
      // Mostramos el error al usuario
      this.errorMessage = error.message || 'Error sending message';

      // Restauramos el texto en el input
      this.messageText = text;
    } finally {
      this.sendingMessage = false;
    }
  }

  handleKeyPress(event: KeyboardEvent): void {
    // Enter sin Shift envía el mensaje
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async signOut(): Promise<void> {
    try {
      // Limpiamos el chat local
      // this.chatService.cleanChat();

      // Cerramos sesión en Firebase
      await this.authService.logout();

      // Navegamos al login
      await this.router.navigate(['/auth']);
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      this.errorMessage = 'Error signing out';
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer?.()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (error) {
      // Error al hacer scroll
    }
  }
  private focusInput(): void {
    setTimeout(() => {
      this.messageInput?.()?.nativeElement?.focus();
    }, 100);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea el contenido de los mensajes del asistente
   * Convierte texto plano en HTML básico
   */
  formatAssistantMessage(content: string): string {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return message.id || `${message.type}-${message.sentDate.getTime()}`;
  }

  handleImageError(event: any): void {
    event.target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMEg2VjIySDZIMThINlYyMEM2IDE2LjY4NjMgMTUuMzEzNyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }
}
