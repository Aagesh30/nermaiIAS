import { IInteraction } from '@nermai/types';

export const InteractionReducers = {
  addOrUpdateMessage(currentList: IInteraction[], newMessage: IInteraction): IInteraction[] {
    const exists = currentList.findIndex(msg => msg.id === newMessage.id);
    if (exists !== -1) {
      // Update existing (e.g. from optimistic to confirmed, or edit)
      const newList = [...currentList];
      newList[exists] = { ...newList[exists], ...newMessage };
      return newList;
    }
    // Append and sort by createdAt
    const merged = [...currentList, newMessage];
    merged.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    return merged;
  },

  deleteMessage(currentList: IInteraction[], messageId: string): IInteraction[] {
    return currentList.filter(msg => msg.id !== messageId);
  },

  updateReaction(currentList: IInteraction[], reactionData: any): IInteraction[] {
    // Logic for updating reaction counts on a specific message
    // reactionData: { messageId, emoji, count }
    const exists = currentList.findIndex(msg => msg.id === reactionData.messageId);
    if (exists !== -1) {
      const newList = [...currentList];
      const msg = newList[exists];
      const metadata = msg.metadata || {};
      const reactions = metadata.reactions || {};
      
      newList[exists] = {
        ...msg,
        metadata: {
          ...metadata,
          reactions: {
            ...reactions,
            [reactionData.emoji]: reactionData.count
          }
        }
      };
      return newList;
    }
    return currentList;
  }
};
