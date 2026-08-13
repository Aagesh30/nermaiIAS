import { InteractionSettings, IInteraction, InteractionContext } from '@nermai/types';

export const Permissions = {
  canSend(type: string, settings: InteractionSettings, isTeacher: boolean): boolean {
    if (isTeacher) return true;
    switch (type) {
      case 'CHAT': return settings.chatEnabled && !settings.teacherOnlyChat;
      case 'QUESTION': return settings.questionEnabled;
      case 'VOICE': return settings.voiceEnabled;
      case 'REACTION': return settings.reactionEnabled;
      case 'POLL_VOTE': return settings.pollEnabled;
      default: return false;
    }
  },

  canEdit(interaction: IInteraction, currentUserId: string, isTeacher: boolean, editWindowMinutes: number): boolean {
    if (isTeacher) return true;
    if (interaction.userId !== currentUserId) return false;
    
    // Check if within edit window
    if (interaction.createdAt) {
      const createdTime = new Date(interaction.createdAt).getTime();
      const now = Date.now();
      return (now - createdTime) <= (editWindowMinutes * 60 * 1000);
    }
    return true;
  },

  canDelete(interaction: IInteraction, currentUserId: string, isTeacher: boolean, studentCanDelete: boolean): boolean {
    if (isTeacher) return true;
    return interaction.userId === currentUserId && studentCanDelete;
  }
};
