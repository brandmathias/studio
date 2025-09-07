
"use client";

import * as React from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, Column, TaskBoardData } from '@/types';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface TaskKanbanBoardProps {
  boardData: TaskBoardData;
  setBoardData: React.Dispatch<React.SetStateAction<TaskBoardData>>;
  onTaskClick: (task: Task) => void;
}

export default function TaskKanbanBoard({ boardData, setBoardData, onTaskClick }: TaskKanbanBoardProps) {

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (type === 'column') {
      const newColumnOrder = Array.from(boardData.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      const newState = {
        ...boardData,
        columnOrder: newColumnOrder,
      };
      setBoardData(newState);
      return;
    }

    const startColumn = boardData.columns[source.droppableId];
    const finishColumn = boardData.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        taskIds: newTaskIds,
      };

      const newState = {
        ...boardData,
        columns: {
          ...boardData.columns,
          [newColumn.id]: newColumn,
        },
      };
      setBoardData(newState);
      return;
    }

    // Moving from one list to another
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...startColumn,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finishColumn,
      taskIds: finishTaskIds,
    };

    const newState = {
      ...boardData,
      columns: {
        ...boardData.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    };
    setBoardData(newState);
  };

  const handleDeleteColumn = (columnId: string) => {
    const newColumns = { ...boardData.columns };
    const tasksToDelete = newColumns[columnId].taskIds;
    delete newColumns[columnId];
    
    const newTasks = { ...boardData.tasks };
    tasksToDelete.forEach(taskId => {
        delete newTasks[taskId];
    });

    const newColumnOrder = boardData.columnOrder.filter(id => id !== columnId);

    setBoardData({
        tasks: newTasks,
        columns: newColumns,
        columnOrder: newColumnOrder,
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="all-columns" direction="horizontal" type="column">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex gap-4 overflow-x-auto p-4 min-h-[calc(100vh-16rem)] items-start"
          >
            {boardData.columnOrder.map((columnId, index) => {
              const column = boardData.columns[columnId];
              const tasks = column.taskIds.map(taskId => boardData.tasks[taskId]).filter(Boolean);

              return (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="w-[300px] flex-shrink-0"
                    >
                      <Card className="bg-muted">
                        <CardHeader className="p-2 flex-row items-center justify-between" {...provided.dragHandleProps}>
                            <h3 className="font-semibold text-base px-2">{column.title}</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteColumn(column.id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </CardHeader>
                        <Droppable droppableId={column.id} type="task">
                          {(provided, snapshot) => (
                            <CardContent
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn("p-2 pt-0 space-y-2 min-h-[100px] transition-colors", snapshot.isDraggingOver ? "bg-accent/20" : "")}
                            >
                              {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => onTaskClick(task)}
                                    >
                                      <Card className="bg-card hover:bg-card/90 cursor-pointer">
                                        <CardContent className="p-3">
                                          <p className="font-medium">{task.title}</p>
                                          <div className="flex justify-between items-center mt-2">
                                            <div className="flex gap-1 flex-wrap">
                                                {task.labels?.map(label => (
                                                    <Badge key={label} variant="secondary">{label}</Badge>
                                                ))}
                                            </div>
                                            {task.assignee && (
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src={task.assignee.avatar} data-ai-hint="person face" />
                                                    <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </CardContent>
                          )}
                        </Droppable>
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
