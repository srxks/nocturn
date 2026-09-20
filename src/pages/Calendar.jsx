import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTasks } from '../context/useTasks'
import CalendarHeader from '../components/calendar/CalendarHeader'
import CalendarGrid from '../components/calendar/CalendarGrid'
import SelectedDayPanel from '../components/calendar/SelectedDayPanel'
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer'

export default function Calendar() {
  const {
    tasks,
    lists,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    selectedTask,
    setSelectedTask,
  } = useTasks()

  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() - 1)
      return next
    })
  }

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentMonthDate(now)
    setSelectedDate(now)
  }

  const handleAddTaskForDate = (dateKey, taskTitle) => {
    if (taskTitle && taskTitle.trim()) {
      addTask(taskTitle.trim(), 'tasks', dateKey)
    }
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Calendar Top Header & Month Toolbar */}
      <CalendarHeader
        currentMonthDate={currentMonthDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      {/* 7-Column Month Grid */}
      <section aria-label="Month Calendar Grid">
        <CalendarGrid
          currentMonthDate={currentMonthDate}
          selectedDate={selectedDate}
          tasks={tasks}
          onSelectDate={setSelectedDate}
        />
      </section>

      {/* Selected Day Detail Panel */}
      <section aria-label="Selected Day Schedule">
        <SelectedDayPanel
          selectedDate={selectedDate}
          tasks={tasks}
          onToggleComplete={toggleTask}
          onAddTaskForDate={handleAddTaskForDate}
          onSelectTask={setSelectedTask}
        />
      </section>

      {/* Task Detail Panel Drawer when task is selected from calendar */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailDrawer
            task={selectedTask}
            lists={lists}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={updateTask}
            onToggleComplete={toggleTask}
            onDeleteTask={deleteTask}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
            isDesktopInline={false}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
