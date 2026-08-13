import { EventEmitter } from 'events';
import { IInteraction } from './types';

class InteractionEventBus extends EventEmitter {
  /**
   * Emitted when a question is marked as answered by a teacher.
   * Future AI modules (like Knowledge Studio) can subscribe to this event
   * to automatically generate FAQs or suggestions, keeping the Interaction Engine
   * strictly decoupled from any AI logic.
   */
  public emitQuestionAnswered(interaction: IInteraction) {
    this.emit('QUESTION_ANSWERED', interaction);
  }

  public emitQuestionPinned(interaction: IInteraction) {
    this.emit('QUESTION_PINNED', interaction);
  }
}

export const interactionEventBus = new InteractionEventBus();
