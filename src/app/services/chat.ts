import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { ChatMessage } from '../models/chat';
import { AuthService } from './auth';

const firestoreServiceMock = {
  fetchUserMessages: (userId: string) => of([]),
  saveMessage: async (message: ChatMessage) => Promise.resolve(),
};

const geminiServiceMock = {
  convertHistoryToGemini: (history: ChatMessage[]) => history,
  sendMessage: async (content: string, history: any) => 'Respuesta mock de Gemini',
};

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);

  // Todavía no implementados:
  // private readonly firestoreService = inject(FirestoreService);
  // private readonly geminiService = inject(GeminiService);

  // BehaviorSubject para mantener la lista de mensajes del chat actual
  // BehaviorSubject siempre tiene un valor inicial y emite el último valor a nuevos suscriptores
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);

  // Observable público para que los componentes puedan suscribirse a los mensajes
  public messages$ = this.messagesSubject.asObservable();

  private isLoadingHistory = false;

  // Variable para controlar si el asistente está respondiendo
  private isAssistantResponding = new BehaviorSubject<boolean>(false);
  public assistantResponding$ = this.isAssistantResponding.asObservable();

  async initializeChat(userId: string): Promise<void> {
    if (this.isLoadingHistory) {
      return;
    }

    this.isLoadingHistory = true;

    try {
      // this.firestoreService.obtenerMensajesUsuario(usuarioId).subscribe({
      //   next: (mensajes) => {
      //     // Actualizamos el BehaviorSubject con los mensajes obtenidos
      //     this.messagesSubject.next(mensajes);
      //     this.isLoadingHistory = false;
      //   },
      //   error: (error) => {
      //     console.error('❌ Error al cargar historial:', error);
      //     this.isLoadingHistory = false;

      //     // En caso de error, iniciamos con una lista vacía
      //     this.messagesSubject.next([]);
      //   }
      // });
      // 🎭 Usando mock del FirestoreService
      firestoreServiceMock.fetchUserMessages(userId).subscribe({
        next: (userMessages) => {
          // Actualizamos el BehaviorSubject con los mensajes obtenidos
          this.messagesSubject.next(userMessages);
          this.isLoadingHistory = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar historial:', error);
          this.isLoadingHistory = false;

          // En caso de error, iniciamos con una lista vacía
          this.messagesSubject.next([]);
        },
      });
    } catch (error) {
      console.error('❌ Error al inicializar chat:', error);
      this.isLoadingHistory = false;
      this.messagesSubject.next([]);
    }
  }

  async sendMessage(messageContent: string): Promise<void> {
    // Obtenemos el usuario actual
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      throw new Error('Usuario no autenticado');
    }

    if (!messageContent.trim()) {
      return;
    }

    // Creamos el mensaje del usuario
    const userMessage: ChatMessage = {
      userId: currentUser.uid,
      content: messageContent.trim(),
      sentDate: new Date(),
      type: 'user',
      status: 'sending',
    };

    try {
      // PRIMERO mostramos el mensaje del usuario en la UI inmediatamente
      const userMessages = this.messagesSubject.value;

      const combinedUserMessages = [...userMessages, userMessage];
      this.messagesSubject.next(combinedUserMessages);

      // DESPUÉS intentamos guardarlo en Firestore (en background)
      try {
        // await this.firestoreService.guardarMensaje(mensajeUsuario);
        await firestoreServiceMock.saveMessage(userMessage);
      } catch (firestoreError) {
        // El mensaje ya está visible, así que continuamos
      }

      // Indicamos que el asistente está procesando la respuesta
      this.isAssistantResponding.next(true);

      // Obtenemos el historial actual para dar contexto a ChatGPT
      const currentMessages = this.messagesSubject.value;

      // Convertimos nuestro historial al formato que espera Gemini
      // Solo tomamos los últimos 6 mensajes para no exceder límites de tokens
      // Esto deja más espacio para respuestas más completas

      // const historialParaGemini = this.geminiService.convertirHistorialAGemini(
      //   mensajesActuales.slice(-6)
      // );
      const geminiMessageHistory = geminiServiceMock.convertHistoryToGemini(
        currentMessages.slice(-6),
      );

      // Enviamos el mensaje a ChatGPT y esperamos la respuesta (usando mock)
      // const respuestaAsistente = await firstValueFrom(
      //   this.geminiService.enviarMensaje(contenidoMensaje, historialParaGemini)
      // );
      const assistantResponse = await geminiServiceMock.sendMessage(
        messageContent,
        geminiMessageHistory,
      );

      // Creamos el mensaje con la respuesta del asistente
      // const mensajeAsistente: ChatMessage = {
      //   userId: usuarioActual.uid,
      //   content: respuestaAsistente,
      //   sentDate: new Date(),
      //   type: 'assistant',
      //   status: 'sent'
      // };

      // POR AHORA, como no tenemos Gemini implementado, usamos un mock
      const assistantMessage: ChatMessage = {
        userId: currentUser.uid,
        content: assistantResponse,
        sentDate: new Date(),
        type: 'assistant',
        status: 'sent',
      };

      // PRIMERO mostramos la respuesta en la UI inmediatamente
      const updatedMessages = this.messagesSubject.value;

      const updatedChatMessages = [...updatedMessages, assistantMessage];
      this.messagesSubject.next(updatedChatMessages);

      // DESPUÉS intentamos guardar en Firestore (en background)
      try {
        // await this.firestoreService.guardarMensaje(mensajeAsistente);
        await firestoreServiceMock.saveMessage(assistantMessage);
      } catch (firestoreError) {
        // El mensaje ya está visible, así que no es crítico
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);

      // En caso de error, creamos un mensaje de error del asistente
      const errorMessage: ChatMessage = {
        userId: currentUser.uid,
        content: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor intenta de nuevo.',
        sentDate: new Date(),
        type: 'assistant',
        status: 'error',
      };

      try {
        // await this.firestoreService.guardarMensaje(mensajeError);
        await firestoreServiceMock.saveMessage(errorMessage);
      } catch (saveErrorError) {
        console.error('❌ Error al guardar mensaje de error:', saveErrorError);
        // Como último recurso, mostramos el error temporalmente en la UI
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, errorMessage]);
      }

      throw error;
    } finally {
      // Siempre indicamos que el asistente ya no está respondiendo
      this.isAssistantResponding.next(false);
    }
  }

  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }

  isChatReady(): boolean {
    const isUserAuthenticated = !!this.authService.getCurrentUser();
    // const geminiConfigurado = this.geminiService.verificarConfiguracion();

    // Por ahora, como no tenemos Gemini implementado, asumimos que siempre está configurado
    const isGeminiConfigured = true;

    return isUserAuthenticated && isGeminiConfigured;
  }
}
