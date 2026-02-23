import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ChatConversation, ChatMessage } from '../models/chat';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private readonly firestore = inject(Firestore);

  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      if (!message.userId) {
        throw new Error('userId es requerido');
      }
      if (!message.content) {
        throw new Error('content es requerido');
      }
      if (!message.type) {
        throw new Error('type es requerido');
      }

      // Obtenemos la referencia a la colección 'messages'
      const messagesCollection = collection(this.firestore, 'messages');

      // Preparamos el mensaje para guardarlo, convirtiendo la fecha a Timestamp de Firebase
      const messageToSave = {
        userId: message.userId,
        content: message.content,
        type: message.type,
        status: message.status || 'sent',
        // Firebase requiere usar Timestamp en lugar de Date
        sentDate: Timestamp.fromDate(message.sentDate),
      };

      // Añadimos el documento a la colección
      await addDoc(messagesCollection, messageToSave);
    } catch (error: any) {
      console.error('❌ Error al guardar mensaje en Firestore:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw error;
    }
  }

  getUserMessages(userId: string): Observable<ChatMessage[]> {
    return new Observable((observer) => {
      // Creamos una consulta para obtener solo los mensajes del usuario especificado
      // NOTA: Removemos temporalmente orderBy para evitar el problema del índice
      const userMessagesQuery = query(
        collection(this.firestore, 'messages'),
        // Filtramos por el ID del usuario
        where('userId', '==', userId),
      );

      // Configuramos el listener en tiempo real
      const unsubscribe = onSnapshot(
        userMessagesQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          // Transformamos los documentos de Firestore en nuestros objetos ChatMessage
          const messages: ChatMessage[] = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
              id: doc.id,
              userId: data['userId'],
              content: data['content'],
              type: data['type'],
              status: data['status'],
              // Convertimos el Timestamp de Firebase de vuelta a Date
              sentDate: data['sentDate'].toDate(),
            } as ChatMessage;
          });

          // ORDENAMOS en el cliente ya que removimos orderBy de la query
          messages.sort((a, b) => a.sentDate.getTime() - b.sentDate.getTime());

          // Emitimos los mensajes a través del Observable
          observer.next(messages);
        },
        (error) => {
          console.error('❌ Error al escuchar mensajes:', error);
          observer.error(error);
        },
      );

      // Función de limpieza que se ejecuta cuando se cancela la suscripción
      return () => {
        unsubscribe();
      };
    });
  }

  async saveConversation(chatConversation: ChatConversation): Promise<void> {
    try {
      const conversationsCollection = collection(this.firestore, 'conversations');

      // Preparamos la conversación, convirtiendo las fechas a Timestamps
      const chatConversationToSave = {
        ...chatConversation,
        creationDate: Timestamp.fromDate(chatConversation.creationDate),
        lastActivity: Timestamp.fromDate(chatConversation.lastActivity),
        // También convertimos las fechas de los mensajes
        messages: chatConversation.messages.map((message) => ({
          ...message,
          sentDate: Timestamp.fromDate(message.sentDate),
        })),
      };

      await addDoc(conversationsCollection, chatConversationToSave);
    } catch (error) {
      console.error('❌ Error al guardar conversación:', error);
      throw error;
    }
  }
}
