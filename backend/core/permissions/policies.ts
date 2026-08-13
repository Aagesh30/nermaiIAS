export const Policies = {
  // Common ownership rule: ensures the user requesting the resource is the owner.
  isOwner: (resourceOwnerId: string, currentUserId: string): boolean => {
    return resourceOwnerId === currentUserId;
  },

  // Ensures a user has access to a batch-restricted resource
  hasBatchAccess: (resourceBatchIds: string[], userBatchIds: string[]): boolean => {
    if (!resourceBatchIds || resourceBatchIds.length === 0) return false;
    return resourceBatchIds.some(id => userBatchIds.includes(id));
  },

  // Ensures the teacher is assigned to the course.
  isAssignedTeacher: (assignedTeacherId: string, currentUserId: string): boolean => {
    return assignedTeacherId === currentUserId;
  }
};
