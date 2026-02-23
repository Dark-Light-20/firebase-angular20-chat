import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatMessage } from '../models/chat';

interface GeminiRequest {
  contents: GeminiMessageContent[]; // Array de contenidos de la conversación
  generationConfig?: {
    // Configuración opcional de generación
    maxOutputTokens?: number; // Máximo número de tokens en la respuesta
    temperature?: number; // Creatividad de la respuesta (0-1)
  };
  safetySettings?: SafetySetting[]; // Configuraciones de seguridad
}

interface GeminiMessageContent {
  role: 'user' | 'model'; // Rol del mensaje (user o model en Gemini)
  parts: PartGemini[]; // Array de partes del contenido
}

interface PartGemini {
  text: string; // Contenido del mensaje
}

interface SafetySetting {
  category: string; // Categoría de seguridad
  threshold: string; // Umbral de bloqueo
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.gemini.apiUrl;
  private readonly apiKey = environment.gemini.apiKey;

  sendMessage(message: string, chatHistory: GeminiMessageContent[] = []): Observable<string> {
    // Verificamos que tenemos la clave de API configurada
    if (!this.apiKey || this.apiKey === 'TU_API_KEY_DE_GEMINI') {
      console.error('❌ API Key de Gemini no configurada');
      return throwError(
        () =>
          new Error(
            'API Key de Gemini no configurada. Por favor configura tu clave en environment.ts',
          ),
      );
    }

    // No necesitamos headers de autorización ya que la API key va en la URL
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Preparamos el contenido del sistema para dar personalidad al asistente
    const systemMessage: GeminiMessageContent = {
      role: 'user',
      parts: [
        {
          text: `Eres un asistente virtual útil y amigable. Responde siempre en español de manera clara y concisa. 
               Eres especialista en ayudar con preguntas generales, programación, y tecnología. 
               Mantén un tono profesional pero cercano.`,
        },
      ],
    };

    const systemResponse: GeminiMessageContent = {
      role: 'model',
      parts: [
        {
          text: 'Entendido. Soy tu asistente virtual especializado en tecnología y programación. Te ayudaré de manera clara y profesional en español. ¿En qué puedo ayudarte?',
        },
      ],
    };

    // Preparamos los contenidos para enviar a Gemini
    const messageContents: GeminiMessageContent[] = [
      systemMessage,
      systemResponse,
      // Añadimos el historial previo para mantener el contexto
      ...chatHistory,
      // Añadimos el mensaje actual del usuario
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    // Configuraciones de seguridad para permitir más contenido técnico
    const securitySettings: SafetySetting[] = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ];

    // Preparamos el cuerpo de la petición según la especificación de Gemini
    const requestBody: GeminiRequest = {
      contents: messageContents,
      generationConfig: {
        maxOutputTokens: 800, // Límite de tokens para la respuesta
        temperature: 0.7, // Creatividad moderada
      },
      safetySettings: securitySettings,
    };

    // URL completa con la API key como parámetro
    const fullApiUrl = `${this.apiUrl}?key=${this.apiKey}`;

    // Hacemos la petición HTTP a la API de Gemini
    return this.http.post<GeminiResponse>(fullApiUrl, requestBody, { headers }).pipe(
      // Transformamos la respuesta para extraer solo el contenido del mensaje
      map((response) => {
        // Verificamos que la respuesta tenga el formato esperado
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];

          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            let contenidoRespuesta = candidate.content.parts[0].text;

            // Verificamos si la respuesta fue truncada por límite de tokens
            if (candidate.finishReason === 'MAX_TOKENS') {
              contenidoRespuesta +=
                '\n\n[Nota: Respuesta truncada por límite de tokens. Puedes pedirme que continúe.]';
            }

            return contenidoRespuesta;
          } else {
            throw new Error('Respuesta de Gemini no contiene contenido válido');
          }
        } else {
          throw new Error('Respuesta de Gemini no tiene el formato esperado');
        }
      }),

      // Manejamos los errores que puedan ocurrir
      catchError((error) => {
        console.error('❌ Error al comunicarse con Gemini:', error);

        // Personalizamos el mensaje de error según el tipo
        let errorMessage = 'Error al conectar con Gemini';

        if (error.status === HttpStatusCode.BadRequest) {
          errorMessage = 'Petición inválida a Gemini. Verifica la configuración.';
        } else if (error.status === HttpStatusCode.Forbidden) {
          errorMessage = 'Clave de API de Gemini inválida o sin permisos';
        } else if (error.status === HttpStatusCode.TooManyRequests) {
          errorMessage = 'Has excedido el límite de peticiones. Intenta de nuevo más tarde.';
        } else if (error.status === HttpStatusCode.InternalServerError) {
          errorMessage = 'Error en el servidor de Gemini. Intenta de nuevo más tarde.';
        } else if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        }

        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Convierte nuestro historial de mensajes al formato que espera Gemini
   * También optimiza el historial para mantener dentro de límites de tokens
   *
   * @param messages - Nuestros mensajes internos
   * @returns Array de contenidos en formato Gemini
   */
  convertMessageHistoryToGemini(messages: ChatMessage[]): GeminiMessageContent[] {
    // Convertimos los mensajes al formato de Gemini
    const convertedMessageHistory: GeminiMessageContent[] = messages.map((msg) => ({
      role: (msg.type === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    // Si tenemos demasiados mensajes, priorizamos los más recientes
    // pero siempre mantenemos pares de pregunta-respuesta completos
    if (convertedMessageHistory.length > 8) {
      // Tomamos los últimos 6 mensajes, pero asegurándonos de mantener pares
      const recentMessages = convertedMessageHistory.slice(-6);

      // Si empezamos con una respuesta del modelo, quitamos el primer mensaje
      // para mantener el contexto conversacional correcto
      if (recentMessages.length > 0 && recentMessages[0].role === 'model') {
        return recentMessages.slice(1);
      }

      return recentMessages;
    }

    return convertedMessageHistory;
  }

  /**
   * Verifica si la API de Gemini está configurada correctamente
   *
   * @returns true si la configuración es válida
   */
  isConfigurationValid(): boolean {
    const isValidConfiguration = !!(
      this.apiKey &&
      this.apiKey !== 'TU_API_KEY_DE_GEMINI' &&
      this.apiUrl
    );

    return isValidConfiguration;
  }
}
