
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Task, TaskBoardData, Column } from '@/types';
import TaskKanbanBoard from '@/components/TaskKanbanBoard';
import AddTaskDialog from '@/components/AddTaskDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [newColumnTitle, setNewColumnTitle] = React.useState('');

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

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    const newColumnId = `column-${Date.now()}`;
    const newColumn: Column = {
      id: newColumnId,
      title: newColumnTitle,
      taskIds: [],
    };

    setBoardData(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [newColumnId]: newColumn,
      },
      columnOrder: [...prev.columnOrder, newColumnId],
    }));
    setNewColumnTitle('');
  };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight font-headline">Lacak Tugas & Alur Kerja</h1>
        </div>

        <Card>
             <CardHeader>
                <CardTitle>Papan Tugas</CardTitle>
                <CardDescription>
                    Kelola alur kerja tim Anda dengan papan Kanban. Tambah tugas, atur kolom, dan pindahkan tugas sesuai progresnya.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Button onClick={handleAddColumn} size="icon">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Input 
                            placeholder="Nama kolom baru..." 
                            value={newColumnTitle}
                            onChange={e => setNewColumnTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                        />
                    </div>
                    <Button onClick={() => handleOpenAddTaskModal(boardData.columnOrder[0] || 'column-1')} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Tugas
                    </Button>
                </div>

                <div className="overflow-x-auto pb-4">
                    <TaskKanbanBoard boardData={boardData} setBoardData={setBoardData} onTaskClick={handleTaskClick} />
                </div>
            </CardContent>
        </Card>

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
