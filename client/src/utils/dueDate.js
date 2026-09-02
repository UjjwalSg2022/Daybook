// A task is overdue when its due date has passed and it hasn't been
// marked Done yet - a finished task is never flagged, even if it was
// completed after its original due date.
export function isOverdue(task) {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate) < new Date();
}