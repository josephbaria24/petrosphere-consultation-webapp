import { supabase } from "./supabaseClient";

export type DimensionWithSet = {
  id?: string;
  code: string;
  dimension_name: string;
  description?: string | null;
  set_id?: string | null;
  dimension_sets?: {
    id: string;
    name: string;
  } | null;
};

/** Load dimensions with their set for survey dropdowns. Falls back if sets aren't migrated yet. */
export async function fetchDimensionsForSurveys(): Promise<DimensionWithSet[]> {
  const withSets = await supabase
    .from("dimensions")
    .select("id, code, dimension_name, description, set_id, dimension_sets(id, name)")
    .order("code", { ascending: true });

  if (!withSets.error && withSets.data) {
    return withSets.data as DimensionWithSet[];
  }

  // Fallback for DBs that haven't run the dimension_sets migration yet
  const fallback = await supabase
    .from("dimensions")
    .select("code, dimension_name, description")
    .order("code", { ascending: true });

  if (fallback.error) {
    console.error(fallback.error);
    return [];
  }

  return (fallback.data || []) as DimensionWithSet[];
}

export function dimensionSelectLabel(d: DimensionWithSet): string {
  const setName = d.dimension_sets?.name;
  if (setName) return `${setName} · ${d.code} – ${d.dimension_name}`;
  return `${d.code} – ${d.dimension_name}`;
}
