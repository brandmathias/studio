
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Task, TaskBoardData } from '@/types';
import TaskKanbanBoard from '@/components/TaskKanbanBoard';
import AddTaskDialog from '@/components/AddTaskDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';

const initialData: TaskBoardData = {
  tasks: {
    'task-1': { id: 'task-1', title: 'Analisis data penjualan Q2', description: 'Kumpulkan semua data penjualan dari April hingga Juni dan buat ringkasan eksekutif.', assignee: { name: 'Admin 1', avatar: 'https://placehold.co/40x40?text=A1' }, labels: ['Penting', 'Laporan'], dueDate: new Date().toISOString() },
    'task-2': { id: 'task-2', title: 'Follow up klaim nasabah XYZ', description: 'Hubungi nasabah untuk menginformasikan status klaim terbaru.' },
    'task-3': { id: 'task-3', title: 'Siapkan materi presentasi untuk rapat mingguan', labels: ['Rapat'] },
    'task-4': { id: 'task-4', title: 'Review draf kebijakan baru', assignee: { name: 'Admin 2', avatar: 'https://placehold.co/40x40?text=A2' }, labels: ['Review'] },
  },
  columns: {
    'column-1': {
      id: 'column-1',
      title: 'Daftar Tugas (To Do)',
      taskIds: ['task-1', 'task-2', 'task-3'],
    },
    'column-2': {
      id: 'column-2',
      title: 'Sedang Dikerjakan (In Progress)',
      taskIds: ['task-4'],
    },
    'column-3': {
      id: 'column-3',
      title: 'Selesai (Done)',
      taskIds: [],
    },
  },
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

export default function TasksPage() {
  const [boardData, setBoardData] = React.useState<TaskBoardData>(initialData);
  const [isAddTaskModalOpen, setAddTaskModalOpen] = React.useState(false);
  const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(null);
  
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isDetailsModalOpen, setDetailsModalOpen] = React.useState(false);

  // Load data from localStorage on mount
  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('loggedInUser');
      const upc = storedUser ? JSON.parse(storedUser).upc : 'all';
      const storageKey = `taskBoardData_${upc}`;

      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        setBoardData(JSON.parse(savedData));
      } else {
        setBoardData(initialData); // Use initial data if nothing is stored
      }
    } catch (error) {
      console.error("Failed to parse task board data from localStorage", error);
      setBoardData(initialData); // Reset to initial if data is corrupt
    }
  }, []);

  // Save data to localStorage whenever it changes
  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('loggedInUser');
      const upc = storedUser ? JSON.parse(storedUser).upc : 'all';
      const storageKey = `taskBoardData_${upc}`;
      localStorage.setItem(storageKey, JSON.stringify(boardData));
    } catch (error) {
      console.error("Failed to save task board data to localStorage", error);
    }
  }, [boardData]);

  const handleOpenAddTaskModal = (columnId: string) => {
    setSelectedColumnId(columnId);
    setAddTaskModalOpen(true);
  };
  
  const handleAddTask = (task: Omit<Task, 'id'>, columnId: string) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask: Task = { id: newTaskId, ...task };

    setBoardData(prev => {
      const newTasks = {
        ...prev.tasks,
        [newTaskId]: newTask,
      };

      const column = prev.columns[columnId];
      const newTaskIds = [...column.taskIds, newTaskId];

      const newColumns = {
        ...prev.columns,
        [columnId]: {
          ...column,
          taskIds: newTaskIds,
        },
      };

      return {
        ...prev,
        tasks: newTasks,
        columns: newColumns,
      };
    });
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailsModalOpen(true);
  };
  
  const handleUpdateTask = (updatedTask: Task) => {
    setBoardData(prev => ({
        ...prev,
        tasks: {
            ...prev.tasks,
            [updatedTask.id]: updatedTask,
        },
    }));
  };
  
  const handleDeleteTask = (taskId: string) => {
     setBoardData(prev => {
        const newTasks = { ...prev.tasks };
        delete newTasks[taskId];

        const newColumns = { ...prev.columns };
        Object.keys(newColumns).forEach(columnId => {
            newColumns[columnId].taskIds = newColumns[columnId].taskIds.filter(id => id !== taskId);
        });

        return {
            ...prev,
            tasks: newTasks,
            columns: newColumns,
        }
     });
  };

  return (
    <main className="flex flex-1 flex-col">
       <div className="flex items-center justify-between p-4 border-b bg-background">
          <h1 className="text-2xl font-bold tracking-tight font-headline">Lacak Tugas & Alur Kerja</h1>
          <Button onClick={() => handleOpenAddTaskModal(boardData.columnOrder[0])}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Tugas
          </Button>
      </div>

      <div className="flex-grow">
          <TaskKanbanBoard boardData={boardData} setBoardData={setBoardData} onTaskClick={handleTaskClick} />
      </div>

      {selectedColumnId && (
        <AddTaskDialog 
            isOpen={isAddTaskModalOpen}
            onClose={() => setAddTaskModalOpen(false)}
            onAddTask={handleAddTask}
            columnId={selectedColumnId}
        />
      )}
      
      <TaskDetailsDialog
        isOpen={isDetailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        task={selectedTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </main>
  );
}
