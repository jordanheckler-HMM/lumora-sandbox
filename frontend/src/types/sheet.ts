export interface SheetState {
  name: string;
  rows: string[][];
  isModified: boolean;
}

export interface SheetColumn {
  key: string;
  name: string;
  editable: boolean;
}

export interface SheetRow {
  [key: string]: string;
}

