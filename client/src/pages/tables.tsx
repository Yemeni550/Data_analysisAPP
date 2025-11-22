import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Table2, FileText, Trash2, Download } from "lucide-react";
import type { Table } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Tables() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: tables, isLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/tables", {
        name,
        columnsMetadata: { columns: [{ name: "Column 1", type: "text", validation: {} }] },
        sourceType: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setIsCreateOpen(false);
      setNewTableName("");
      toast({
        title: "Success",
        description: "Table created successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create table",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tables/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setDeletingTable(null);
      toast({
        title: "Success",
        description: "Table deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
    },
  });

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      createMutation.mutate(newTableName);
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case "manual":
        return "default";
      case "ocr":
        return "secondary";
      case "auto_capture":
        return "outline";
      case "import":
        return "outline";
      default:
        return "default";
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Table Manager</h1>
          <p className="text-muted-foreground">Create and manage structured data tables</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-table">
          <Plus className="mr-2 h-4 w-4" />
          Create Table
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !tables || tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Table2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-lg font-medium">No tables yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Get started by creating your first data table
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-6" data-testid="button-create-first-table">
              <Plus className="mr-2 h-4 w-4" />
              Create Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className="hover-elevate" data-testid={`card-table-${table.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {table.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Source:</span>
                  <Badge variant={getSourceTypeColor(table.sourceType)}>
                    {table.sourceType.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(table.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" data-testid={`button-export-${table.id}`}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingTable(table)}
                  data-testid={`button-delete-table-${table.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid="dialog-create-table">
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Create a new table for managing structured data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                placeholder="My Data Table"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                data-testid="input-table-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setNewTableName("");
              }}
              data-testid="button-cancel-table"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTable}
              disabled={!newTableName.trim() || createMutation.isPending}
              data-testid="button-save-table"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingTable} onOpenChange={(open) => !open && setDeletingTable(null)}>
        <DialogContent data-testid="dialog-delete-table">
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTable?.name}"? This action cannot be undone and all data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTable(null)}
              data-testid="button-cancel-delete-table"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTable && deleteMutation.mutate(deletingTable.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-table"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
