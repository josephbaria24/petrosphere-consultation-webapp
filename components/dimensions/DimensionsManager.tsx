"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../@/components/ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../../@/components/ui/checkbox";
import { Badge } from "../../@/components/ui/badge";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../app/AppProvider";

export type DimensionSet = {
  id: string;
  name: string;
  description: string | null;
  org_id: string | null;
  created_at?: string;
};

export type Dimension = {
  id: string;
  code: string;
  dimension_name: string;
  description: string | null;
  set_id: string;
};

type DimensionsManagerProps = {
  /** When true, new sets are tagged with the current org. */
  scopeToOrg?: boolean;
};

export function DimensionsManager({ scopeToOrg = true }: DimensionsManagerProps) {
  const { org } = useApp();
  const [sets, setSets] = React.useState<DimensionSet[]>([]);
  const [selectedSetId, setSelectedSetId] = React.useState<string | null>(null);
  const [dimensions, setDimensions] = React.useState<Dimension[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [setsLoading, setSetsLoading] = React.useState(true);

  const [newDimension, setNewDimension] = React.useState({
    code: "",
    dimension_name: "",
    description: "",
  });

  const [setDialogOpen, setSetDialogOpen] = React.useState(false);
  const [editingSet, setEditingSet] = React.useState<DimensionSet | null>(null);
  const [setForm, setSetForm] = React.useState({ name: "", description: "" });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const selectedSet = sets.find((s) => s.id === selectedSetId) || null;

  const fetchSets = React.useCallback(async () => {
    setSetsLoading(true);
    let query = supabase
      .from("dimension_sets")
      .select("*, dimensions(count)")
      .order("created_at", { ascending: true });

    if (scopeToOrg && org?.id) {
      query = query.or(`org_id.eq.${org.id},org_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      // Fallback without count embed if relationship isn't exposed yet
      let fallbackQuery = supabase
        .from("dimension_sets")
        .select("*")
        .order("created_at", { ascending: true });
      if (scopeToOrg && org?.id) {
        fallbackQuery = fallbackQuery.or(`org_id.eq.${org.id},org_id.is.null`);
      }
      const fallback = await fallbackQuery;
      if (fallback.error) {
        toast.error(
          fallback.error.message.includes("dimension_sets")
            ? "Dimension sets table missing. Run the latest Supabase migration."
            : "Failed to load dimension sets"
        );
        setSets([]);
        setSetsLoading(false);
        return;
      }
      const next = (fallback.data || []) as DimensionSet[];
      setSets(next);
      setSelectedSetId((prev) => {
        if (prev && next.some((s) => s.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
      setSetsLoading(false);
      return;
    }

    const next = ((data || []) as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      org_id: row.org_id,
      created_at: row.created_at,
      dimension_count: Array.isArray(row.dimensions)
        ? Number(row.dimensions[0]?.count ?? 0)
        : 0,
    })) as (DimensionSet & { dimension_count?: number })[];

    setSets(next);
    setSelectedSetId((prev) => {
      if (prev && next.some((s) => s.id === prev)) return prev;
      // Prefer the set that still has dimensions (avoids empty Default after remigration)
      const withData = [...next].sort(
        (a, b) => (b.dimension_count || 0) - (a.dimension_count || 0)
      );
      return withData[0]?.id ?? null;
    });
    setSetsLoading(false);
  }, [org?.id, scopeToOrg]);

  const fetchDimensions = React.useCallback(async (setId: string | null) => {
    if (!setId) {
      setDimensions([]);
      return;
    }
    const { data, error } = await supabase
      .from("dimensions")
      .select("id, code, dimension_name, description, set_id")
      .eq("set_id", setId)
      .order("code", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load dimensions");
      setDimensions([]);
      return;
    }
    setDimensions((data || []) as Dimension[]);
  }, []);

  React.useEffect(() => {
    void fetchSets();
  }, [fetchSets]);

  React.useEffect(() => {
    void fetchDimensions(selectedSetId);
  }, [selectedSetId, fetchDimensions]);

  const openCreateSet = () => {
    setEditingSet(null);
    setSetForm({ name: "", description: "" });
    setSetDialogOpen(true);
  };

  const openEditSet = () => {
    if (!selectedSet) return;
    setEditingSet(selectedSet);
    setSetForm({
      name: selectedSet.name,
      description: selectedSet.description || "",
    });
    setSetDialogOpen(true);
  };

  const handleSaveSet = async () => {
    if (!setForm.name.trim()) {
      toast.warning("Set name is required");
      return;
    }
    setLoading(true);
    try {
      if (editingSet) {
        const { error } = await supabase
          .from("dimension_sets")
          .update({
            name: setForm.name.trim(),
            description: setForm.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSet.id);
        if (error) throw error;
        toast.success("Set updated");
      } else {
        const { data, error } = await supabase
          .from("dimension_sets")
          .insert([
            {
              name: setForm.name.trim(),
              description: setForm.description.trim() || null,
              org_id: scopeToOrg ? org?.id || null : null,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        toast.success("Set created");
        setSelectedSetId(data.id);
      }
      setSetDialogOpen(false);
      await fetchSets();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save set");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedSet) return;
    if (
      !window.confirm(
        `Delete set "${selectedSet.name}" and all of its dimensions? This cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    // Delete dimensions first (set_id FK is RESTRICT so the set can't be removed while rows remain)
    const { error: dimError } = await supabase
      .from("dimensions")
      .delete()
      .eq("set_id", selectedSet.id);
    if (dimError) {
      toast.error("Failed to delete dimensions in this set");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("dimension_sets")
      .delete()
      .eq("id", selectedSet.id);
    if (error) {
      toast.error("Failed to delete set");
    } else {
      toast.success("Set deleted");
      setSelectedSetId(null);
      await fetchSets();
    }
    setLoading(false);
  };

  const handleAddDimension = async () => {
    if (!selectedSetId) {
      toast.warning("Create or select a dimension set first");
      return;
    }
    if (!newDimension.code.trim() || !newDimension.dimension_name.trim()) {
      toast.warning("Code and Name are required");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("dimensions").insert([
      {
        code: newDimension.code.trim(),
        dimension_name: newDimension.dimension_name.trim(),
        description: newDimension.description.trim() || null,
        set_id: selectedSetId,
      },
    ]);
    if (error) {
      console.error(error);
      toast.error(
        error.code === "23505"
          ? "That code already exists in this set"
          : "Failed to add dimension"
      );
    } else {
      toast.success("Dimension added");
      setNewDimension({ code: "", dimension_name: "", description: "" });
      await fetchDimensions(selectedSetId);
    }
    setLoading(false);
  };

  const handleUpdateDimension = async (updated: Dimension) => {
    const { error } = await supabase
      .from("dimensions")
      .update({
        code: updated.code.trim(),
        dimension_name: updated.dimension_name.trim(),
        description: updated.description,
      })
      .eq("id", updated.id);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "That code already exists in this set"
          : "Update failed"
      );
      await fetchDimensions(selectedSetId);
    } else {
      toast.success("Updated");
    }
  };

  const handleDeleteDimension = async (id: string) => {
    const { error } = await supabase.from("dimensions").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      await fetchDimensions(selectedSetId);
    }
  };

  const columns: ColumnDef<Dimension>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => {
        const dim = row.original;
        return (
          <Input
            value={dim.code}
            onChange={(e) => {
              const updated = { ...dim, code: e.target.value };
              setDimensions((prev) =>
                prev.map((d) => (d.id === dim.id ? updated : d))
              );
            }}
            onBlur={() => {
              const current = dimensions.find((d) => d.id === dim.id) || dim;
              void handleUpdateDimension(current);
            }}
          />
        );
      },
    },
    {
      accessorKey: "dimension_name",
      header: "Name",
      cell: ({ row }) => {
        const dim = row.original;
        return (
          <Input
            value={dim.dimension_name}
            onChange={(e) => {
              const updated = { ...dim, dimension_name: e.target.value };
              setDimensions((prev) =>
                prev.map((d) => (d.id === dim.id ? updated : d))
              );
            }}
            onBlur={() => {
              const current = dimensions.find((d) => d.id === dim.id) || dim;
              void handleUpdateDimension(current);
            }}
          />
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const dim = row.original;
        return (
          <Input
            value={dim.description || ""}
            onChange={(e) => {
              const updated = { ...dim, description: e.target.value };
              setDimensions((prev) =>
                prev.map((d) => (d.id === dim.id ? updated : d))
              );
            }}
            onBlur={() => {
              const current = dimensions.find((d) => d.id === dim.id) || dim;
              void handleUpdateDimension(current);
            }}
          />
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void handleDeleteDimension(row.original.id)}
          className="text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: dimensions,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Dimensions</h1>
        <p className="text-sm text-muted-foreground">
          Organize dimensions into sets (for example Safety Culture vs a
          client-specific pack). Surveys pick codes from the set you use.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sets panel */}
        <div className="border rounded-xl bg-card p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Layers className="h-4 w-4 text-primary" />
              Dimension sets
            </div>
            <Button size="sm" variant="outline" onClick={openCreateSet}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>

          {setsLoading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Loading sets…
            </p>
          ) : sets.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-muted-foreground">No sets yet.</p>
              <Button size="sm" onClick={openCreateSet}>
                Create first set
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {sets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => setSelectedSetId(set.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedSetId === set.id
                      ? "bg-primary/10 text-foreground border border-primary/20"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div className="font-medium truncate flex items-center justify-between gap-2">
                    <span className="truncate">{set.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(set as DimensionSet & { dimension_count?: number })
                        .dimension_count ?? "—"}
                    </span>
                  </div>
                  {set.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {set.description}
                    </div>
                  )}
                  {!set.org_id && (
                    <Badge
                      variant="secondary"
                      className="mt-1 text-[10px] font-normal"
                    >
                      Shared
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dimensions for selected set */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold truncate">
                  {selectedSet?.name || "Select a set"}
                </h2>
                {selectedSet && (
                  <Badge variant="outline" className="font-normal">
                    {dimensions.length} dimension
                    {dimensions.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              {selectedSet?.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSet.description}
                </p>
              )}
            </div>
            {selectedSet && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={openEditSet}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => void handleDeleteSet()}
                  disabled={loading}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete set
                </Button>
              </div>
            )}
          </div>

          {!selectedSetId ? (
            <div className="border border-dashed rounded-xl p-10 text-center text-sm text-muted-foreground">
              Create a dimension set to start adding codes.
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1 grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="mb-1.5 block text-xs">Code</Label>
                    <Input
                      placeholder="e.g. MC01"
                      value={newDimension.code}
                      onChange={(e) =>
                        setNewDimension({ ...newDimension, code: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Name</Label>
                    <Input
                      placeholder="e.g. Management Commitment"
                      value={newDimension.dimension_name}
                      onChange={(e) =>
                        setNewDimension({
                          ...newDimension,
                          dimension_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Description</Label>
                    <Input
                      placeholder="Optional"
                      value={newDimension.description}
                      onChange={(e) =>
                        setNewDimension({
                          ...newDimension,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={() => void handleAddDimension()}
                  disabled={loading}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  placeholder="Filter by code..."
                  value={
                    (table.getColumn("code")?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table.getColumn("code")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
                <div className="hidden sm:block text-xs text-muted-foreground ml-auto">
                  Active set
                </div>
                <Select
                  value={selectedSetId}
                  onValueChange={(value) => setSelectedSetId(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Choose set" />
                  </SelectTrigger>
                  <SelectContent>
                    {sets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-center text-muted-foreground"
                        >
                          No dimensions in this set yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
                <div>
                  {table.getFilteredSelectedRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSet ? "Rename dimension set" : "New dimension set"}
            </DialogTitle>
            <DialogDescription>
              A set is a collection of dimension codes you can reuse across
              surveys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1.5 block">Name</Label>
              <Input
                value={setForm.name}
                onChange={(e) =>
                  setSetForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Client XYZ Safety Culture"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={setForm.description}
                onChange={(e) =>
                  setSetForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional notes"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSet()} disabled={loading}>
              {editingSet ? "Save" : "Create set"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
