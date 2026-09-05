import TaskItem from './TaskItem'

export default function TaskGroup({
  title,
  tasks,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
}) {
  if (tasks.length === 0) return null

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <section className="space-y-3">
      {/* Group Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
          {title}
        </h2>
        <span className="text-xs text-nocturn-muted font-medium bg-nocturn-surface px-2.5 py-0.5 rounded-full border border-nocturn-border">
          {completedCount}/{tasks.length} done
        </span>
      </div>

      {/* Group Task List */}
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </section>
  )
}
