import { OpenAIState } from './openai/OpenAIState';
import { OpenAIInitializer } from './openai/OpenAIInitializer';
import { OpenAIProcessor } from './openai/OpenAIProcessor';

export class OpenAIService {
  private state: OpenAIState;
  private initializer: OpenAIInitializer;
  private processor: OpenAIProcessor;

  constructor() {
    console.log('Creating new OpenAIService instance');
    this.state = new OpenAIState();
    this.initializer = new OpenAIInitializer(this.state);
    this.processor = new OpenAIProcessor(this.state);
  }

  async initialize() {
    return this.initializer.initialize();
  }

  setSlackAccountId(id: string | null) {
    this.state.setSlackAccountId(id);
  }

  getSlackAccountId(): string | null {
    return this.state.getSlackAccountId();
  }

  isInitialized(): boolean {
    return this.state.isInitialized();
  }

  async processAudioChunk(audioBlob: Blob) {
    return this.processor.processAudioChunk(audioBlob);
  }

  cleanup() {
    console.log(`[OpenAIService ${this.state.getInstanceId()}] Cleaning up`);
    this.state.reset();
    this.processor.cleanup();
  }
}