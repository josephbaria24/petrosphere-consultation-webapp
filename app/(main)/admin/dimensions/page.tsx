'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../@/components/ui/table'
import { Input } from '../../../../components/ui/input'
import { Button } from '../../../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu'
import { ChevronDown, MoreHorizontal, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../../../lib/supabaseClient'
import { toast } from 'sonner'
import { Checkbox } from '../../../../@/components/ui/checkbox'

type Dimension = {
  code: string
  dimension_name: string
  description: string | null
}

export default function ManageDimensionsPage() {
  const [dimensions, setDimensions] = React.useState<Dimension[]>([])
  const [newDimension, setNewDimension] = React.useState<Dimension>({
    code: '',
    dimension_name: '',
    description: '',
  })

  const [loading, setLoading] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const fetchDimensions = async () => {
    const { data, error } = await supabase.from('dimensions').select('*')
    if (error) toast.error('Failed to load dimensions')
    else setDimensions(data || [])
  }

  const handleAdd = async () => {
    if (!newDimension.code || !newDimension.dimension_name) {
      toast.warning('Code and Name are required')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('dimensions').insert([newDimension])
    if (error) toast.error('Failed to add dimension')
    else {
      toast.success('Dimension added')
      setNewDimension({ code: '', dimension_name: '', description: '' })
      fetchDimensions()
    }
    setLoading(false)
  }

  const handleUpdate = async (updated: Dimension) => {
    const { error } = await supabase
      .from('dimensions')
      .update({
        dimension_name: updated.dimension_name,
        description: updated.description,
      })
      .eq('code', updated.code)
    if (error) toast.error('Update failed')
    else toast.success('Updated')
  }

  const handleDelete = async (code: string) => {
    const { error } = await supabase.from('dimensions').delete().eq('code', code)
    if (error) toast.error('Failed to delete')
    else {
      toast.success('Deleted')
      fetchDimensions()
    }
  }

  const columns: ColumnDef<Dimension>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
        checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
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
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => {
        const dim = row.original
        return (
          <Input
            value={dim.code}
            onChange={(e) => {
              const updated = { ...dim, code: e.target.value }
              setDimensions((prev) =>
                prev.map((d) => (d.code === dim.code ? updated : d))
              )
            }}
            onBlur={() => handleUpdate(dim)}
          />
        )
      },
    },
    {
      accessorKey: 'dimension_name',
      header: 'Name',
      cell: ({ row }) => {
        const dim = row.original
        return (
          <Input
            value={dim.dimension_name}
            onChange={(e) => {
              const updated = { ...dim, dimension_name: e.target.value }
              setDimensions((prev) =>
                prev.map((d) => (d.code === dim.code ? updated : d))
              )
            }}
            onBlur={() => handleUpdate(dim)}
          />
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const dim = row.original
        return (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(dim.code)}
            className="text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )
      },
    },
  ]
  
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
  })

  React.useEffect(() => {
    fetchDimensions()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Add New Dimension */}
      <div className="flex items-end gap-4">
        <Input
          placeholder="Code"
          value={newDimension.code}
          onChange={(e) => setNewDimension({ ...newDimension, code: e.target.value })}
        />
        <Input
          placeholder="Name"
          value={newDimension.dimension_name}
          onChange={(e) =>
            setNewDimension({ ...newDimension, dimension_name: e.target.value })
          }
        />
        <Input
          placeholder="Description"
          value={newDimension.description || ''}
          onChange={(e) =>
            setNewDimension({ ...newDimension, description: e.target.value })
          }
        />
        <Button onClick={handleAdd} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* DataTable */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by code..."
          value={(table.getColumn('code')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('code')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No dimensions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
        <div>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
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
    </div>
  )
}
