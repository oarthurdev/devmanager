"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Clock, XCircle, Trash2, Plus } from "lucide-react";
import { createActivity } from "@/lib/activityUtils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_hours: number;
  deadline: string;
  completed_at: string | null;
}

interface TasksListProps {
  projectId: string;
  canEdit: boolean;
}

const ProjectTasks: React.FC<TasksListProps> = ({ projectId, canEdit }) => {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", deadline: "" });

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar tarefas:", error);
        return;
      }
      setTasks(data);
      setLoading(false);
    };

    fetchTasks();
  }, [projectId, supabase]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: newTask.title,
        description: newTask.description,
        status: "pending",
        priority: newTask.priority,
        deadline: newTask.deadline,
        estimated_hours: 0,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao adicionar tarefa:", error);
      return;
    }

    await createActivity("task_create", `Tarefa "${newTask.title}" criada`, projectId, { task: newTask.title });

    setTasks((prev) => [...prev, data]);
    setNewTask({ title: "", description: "", priority: "medium", deadline: "" });
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Tarefas</h3>

      {canEdit && (
        <div className="space-y-4 mb-6">
          <Input
            placeholder="Título da Tarefa"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <Textarea
            placeholder="Descrição"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
          />
          <Button onClick={handleAddTask} className="w-full flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Tarefa
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-gray-500">Nenhuma tarefa encontrada.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex gap-2 items-center mt-2">
                    <Badge variant={task.priority === "high" ? "destructive" : "outline"}>{task.priority}</Badge>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)} {task.status}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <div className="mt-2 text-sm text-gray-500">
                Prazo: {task.deadline ? format(new Date(task.deadline), "dd/MM/yyyy") : "Sem prazo"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ProjectTasks;
