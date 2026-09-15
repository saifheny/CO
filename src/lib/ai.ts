// AI Abstraction Layer
// This file defines the interface for interacting with the AI.
// It uses a Mock implementation by default, but can easily be swapped out for a real API.

export interface AIProvider {
  enhanceHandwriting: (text: string) => Promise<string>;
  summarize: (text: string) => Promise<string>;
  explain: (text: string) => Promise<string>;
  generateFlashcards: (text: string) => Promise<{ front: string, back: string }[]>;
}

// Mock Provider for development
export class MockAIProvider implements AIProvider {
  async enhanceHandwriting(text: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1000));
    return `✨ Enhanced: ${text}`;
  }

  async summarize(text: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1500));
    return `📝 Summary of your notes:\n- ${text.substring(0, 50)}...\n- Key point 2\n- Key point 3`;
  }

  async explain(text: string): Promise<string> {
    void text;
    await new Promise(r => setTimeout(r, 1500));
    return `🧠 Explanation:\nThis text refers to the concept of AI abstraction. It allows seamless switching between different LLMs (like Gemini, OpenAI, Claude).`;
  }

  async generateFlashcards(text: string): Promise<{ front: string, back: string }[]> {
    void text;
    await new Promise(r => setTimeout(r, 2000));
    return [
      { front: 'What is the main topic?', back: 'The main topic is AI integration.' },
      { front: 'Define Abstraction Layer', back: 'A way to hide complex details behind a simple interface.' }
    ];
  }
}

export const ai = new MockAIProvider();
