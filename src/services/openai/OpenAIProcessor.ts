import { TextToSpeechService } from "../TextToSpeechService";
import { SlackService } from "../SlackService";
import { OpenAIState } from "./OpenAIState";
import { MessageHandler } from "./handlers/MessageHandler";
import { AudioProcessor } from "./processors/AudioProcessor";
import { ChatProcessor } from "./processors/ChatProcessor";

export class OpenAIProcessor {
  private audioProcessor: AudioProcessor;
  private chatProcessor: ChatProcessor;
  private textToSpeechService: TextToSpeechService;
  private messageHandler: MessageHandler;

  constructor(state: OpenAIState) {
    this.textToSpeechService = new TextToSpeechService();
    const slackService = new SlackService();
    this.messageHandler = new MessageHandler(state, this.textToSpeechService, slackService);
    
    this.audioProcessor = new AudioProcessor(state);
    this.chatProcessor = new ChatProcessor(state, this.messageHandler);
  }

  async processAudioChunk(audioBlob: Blob): Promise<{ transcribedText: string; aiResponse: string } | void> {
    try {
      console.log(`[OpenAIProcessor] Starting audio chunk processing`);
      
      const transcribedText = await this.audioProcessor.processTranscription(audioBlob);
      if (!transcribedText) return;

      const response = await this.chatProcessor.processChatResponse(
        transcribedText,
        this.state.getSlackAccountId()!
      );

      // Always speak the AI's response
      if (response.aiResponse) {
        await this.textToSpeechService.speakText(response.aiResponse);
      }

      return response;
    } catch (error) {
      console.error(`[OpenAIProcessor] Error:`, error);
      throw error;
    }
  }

  cleanup() {
    this.textToSpeechService.cleanup();
  }
}